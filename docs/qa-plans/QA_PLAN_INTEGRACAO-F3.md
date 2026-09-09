# QA Plan — Integração Fase 3 (cross-story / ponta-a-ponta)

## Summary
Os QA Plans individuais (`QA_PLAN_US-F3-01` a `12`) validam cada história isoladamente. Este plano complementa esses documentos com cenários que atravessam fronteiras de história — onde um bug só aparece quando duas ou mais peças (repositórios/dominios) interagem em tempo real. Não substitui nenhum QA Plan existente; é um nível a mais de cobertura, focado nos pontos de maior risco de efeito cascata do sistema.

Este plano não cobre nenhuma história isolada e não tem "critérios de aceite" próprios — a rastreabilidade abaixo mapeia cada cenário aos QA Plans/histórias que ele atravessa.

## Prerequisites
- Ambiente com os 4 repositórios rodando de ponta a ponta: `auth-lambda` deployada, API Gateway com rota protegida, app no EKS (ou local via Docker Compose apontando pro RDS/Postgres), observabilidade (Datadog ou equivalente local) coletando logs/métricas.
- Cliente de teste com CPF válido cadastrado no banco.
- Acesso a um destino de teste para o webhook outbound (webhook.site ou mock local) e ao endpoint de webhook inbound de aprovação.
- Ferramenta para inspecionar logs estruturados (CloudWatch, `kubectl logs`, ou Datadog Log Explorer) e correlacionar por `correlationId`.
- **Nota de escopo:** os cenários TS-04 e TS-05 dependem de trabalho que, na data deste plano, ainda está em branches não mergeadas (`feature/us-f3-04` no `infra-db`, ver "Achados de git" no contexto do grupo). Rode esses dois só depois que as branches relevantes estiverem em `main`.

## Test Scenarios

### TS-01: Fluxo de autenticação ponta-a-ponta (CPF → JWT → rota protegida)
- **Type:** Manual / Automated (e2e, se houver ambiente de staging)
- **Atravessa:** US-F3-01 (Lambda), US-F3-02 (API Gateway), US-F3-03 (app como Resource Server)
- **Precondition:** Cliente com CPF válido cadastrado; Lambda e app deployados
- **Steps:**
  1. `POST {gateway}/auth` com o CPF do cliente de teste
  2. Extrair o JWT da resposta e decodificar o payload (sem validar assinatura) pra conferir `issuer: oficina-auth-lambda` e claims esperadas
  3. Usar o JWT pra chamar uma rota protegida do app (ex.: `GET /ordens-servico`)
  4. Repetir o passo 3 com um JWT expirado ou de issuer diferente
- **Expected result:** Passo 3 retorna 200 com os dados esperados; passo 4 retorna 401 do `JwtStrategy` do app (não do gateway), confirmando que o app valida o token de forma independente e não confia cegamente no gateway
- **Alternative result (erro):** Se o passo 4 retornar 200, é uma falha crítica de segurança — o app não está validando issuer/assinatura corretamente

### TS-02: Rastreabilidade de correlationId entre Lambda e app
- **Type:** Manual
- **Atravessa:** US-F3-01 (Lambda), US-F3-09 (logs estruturados do app)
- **Precondition:** Logs da Lambda e do app acessíveis na mesma janela de tempo
- **Steps:**
  1. Fazer uma chamada `POST {gateway}/auth` sem enviar `x-correlation-id`
  2. Usar o JWT retornado pra chamar uma rota protegida do app, também sem enviar `x-correlation-id`
  3. Inspecionar os logs da Lambda e os logs do app pra essa janela de tempo
- **Expected result:** O app gera e loga um `correlationId` próprio (via `correlation-id.interceptor.ts`) pra sua própria requisição — isso já está coberto pelo QA_PLAN_US-F3-09
- **Alternative result (gap conhecido a investigar):** Não há, no código atual da Lambda (`auth-lambda/src`), nenhuma geração/propagação de `correlationId` equivalente à do app — ou seja, hoje **não dá pra correlacionar um login na Lambda com as chamadas subsequentes no app pelo mesmo id**. Se esse cenário falhar (não encontrar id comum), documentar como gap real pro grupo decidir se vale a pena propagar `x-correlation-id` desde o `POST /auth` (a Lambda ecoaria o header recebido do API Gateway, e o app usaria esse mesmo id se o cliente o repassasse na chamada seguinte)

### TS-03: Ciclo de vida completo da OS com falha isolada no webhook outbound
- **Type:** Automated (e2e) / Manual
- **Atravessa:** US-06, US-11, US-13, US-14 (ciclo da OS), US-F2-03 (webhook outbound), US-F3-09/10/11 (logs/métricas/alertas)
- **Precondition:** OS nova, `NOTIFICATION_PROVIDER=webhook`, destino do webhook configurado para falhar (ex.: apontar pra uma URL que sempre retorna 500 ou nunca responde)
- **Steps:**
  1. Abrir uma OS (US-06), registrar diagnóstico e orçamento (US-11)
  2. Aprovar o orçamento via webhook inbound (US-F2-02) — isso deve mudar o status pra `EM_EXECUCAO`
  3. Confirmar que a notificação de orçamento pronto (`OrcamentoProntoEvent`) tentou o webhook outbound e falhou (2 tentativas, conforme `webhook-notificador.adapter.ts`)
  4. Avançar a OS até `FINALIZADA` (US-14) e confirmar que o evento `OsFinalizadaEvent` também tenta notificar e falha da mesma forma
  5. Verificar que, apesar das falhas de notificação, **cada transição de status da OS foi persistida normalmente** (o listener roda via `@OnEvent`, fora do fluxo síncrono de request/response)
  6. Verificar no dashboard (US-F3-11) que a métrica `integracao_resultados{integracao="webhook-notificacao", resultado="falha"}` incrementou e que o alerta de "erro de integração" dispara
- **Expected result:** OS completa o ciclo normalmente do início ao fim mesmo com o canal de notificação 100% fora do ar; a falha fica visível apenas em log/métrica/alerta, nunca na resposta da API de OS
- **Alternative result (erro):** Se qualquer chamada da API de OS (abertura, aprovação, finalização) retornar erro ou demorar visivelmente mais por causa do timeout do webhook (5s x 2 tentativas + 250ms), é uma falha de isolamento — o listener deveria ser assíncrono em relação ao ciclo de vida da OS, não bloqueá-lo

### TS-04: Banco de dados gerenciado indisponível — degradação do app
- **Type:** Manual (requer ambiente com RDS real ou simulação de indisponibilidade)
- **Atravessa:** US-F3-04 (RDS), US-F3-06 (deploy no EKS), US-F3-10/11 (observabilidade)
- **Precondition:** App rodando no EKS apontando pra um RDS com `multi_az` habilitado (branch `feature/us-f3-04`, quando mergeada)
- **Steps:**
  1. Simular indisponibilidade do RDS (ex.: reboot com failover forçado, ou revogar acesso de rede temporariamente via security group)
  2. Chamar qualquer rota do app que dependa do banco durante a janela de indisponibilidade
  3. Observar o comportamento dos pods (healthcheck/readiness probe) e a resposta da API
  4. Após o failover/restabelecimento, repetir a chamada
- **Expected result:** Durante a indisponibilidade, a API responde com erro controlado (5xx claro, não timeout genérico nem crash do pod) e o healthcheck reflete o estado degradado; após o RDS voltar, a aplicação se recupera sem precisar de restart manual dos pods; o dashboard mostra o pico de erro e o alerta correspondente dispara
- **Alternative result (erro):** Pods entrando em crash loop, ou aplicação não reconectando ao banco sozinha após o failover (indicaria falta de retry/reconexão no client Prisma) — reportar como bug antes da entrega final

### TS-05: Ordem de deploy entre repositórios (dependência de outputs Terraform)
- **Type:** Manual
- **Atravessa:** US-F3-04 (RDS), US-F3-05 (EKS/rede), US-F3-08 (CI/CD)
- **Precondition:** Nenhum recurso ainda provisionado (ambiente do zero, ex.: nova sessão do AWS Academy)
- **Steps:**
  1. Tentar aplicar o Terraform do `infra-db` (branch `feature/us-f3-04`) **antes** de aplicar o `infra-k8s` (rede/VPC)
  2. Observar se o `apply` falha de forma clara (variável/output faltando) ou se produz um erro genérico difícil de diagnosticar
  3. Aplicar `infra-k8s` primeiro, depois `infra-db`, seguindo a ordem documentada
- **Expected result:** Se a ordem errada for tentada, o erro do Terraform aponta claramente qual output/variável está faltando (ex.: subnet id do `infra-k8s`); a documentação (`AWS_ACADEMY_SETUP.md` da branch) descreve a ordem correta
- **Alternative result (gap a documentar):** Se o erro for genérico/confuso, recomendar adicionar uma nota explícita no README do `infra-db` sobre a dependência de ordem de apply entre os repos 2 e 3

### TS-06: Consistência de contrato de erro entre webhook inbound e app
- **Type:** Automated (e2e)
- **Atravessa:** US-F2-02 (webhook inbound de aprovação), US-13 (aprovação/rejeição de orçamento)
- **Precondition:** OS em `AGUARDANDO_APROVACAO`
- **Steps:**
  1. Aprovar a mesma OS duas vezes seguidas via webhook (simulando reenvio por timeout de um sistema externo)
  2. Verificar a resposta da segunda chamada
- **Expected result:** Segunda chamada retorna 409 (OS já não está mais em `AGUARDANDO_APROVACAO`), sem reprocessar nem duplicar efeitos colaterais (ex.: sem enviar a notificação de orçamento pronto duas vezes)
- **Alternative result (erro):** Reprocessamento duplicado indicaria falta de idempotência no endpoint de webhook — risco real em produção, já que sistemas externos frequentemente reenviam por timeout

## Edge Cases
- Login na Lambda com CPF válido mas cliente inativo/bloqueado — confirmar que o app também rejeita, não só a Lambda (defesa em profundidade, não confiar só na Lambda)
- Relógio dessincronizado entre Lambda e app (JWT `exp` avaliado com clock skew) — verificar tolerância configurada
- Webhook outbound e RDS indisponíveis ao mesmo tempo — confirmar que as duas falhas são reportadas separadamente nas métricas/alertas, não mascaradas uma pela outra
- Volume alto de mudanças de status simultâneas (ex.: importação em lote) gerando rajada de webhooks — confirmar que não derruba o event loop nem estoura rate limit do destino

## Traceability (histórias/QA Plans atravessados por cenário)

| Cenário | QA Plans / Histórias envolvidas |
|---|---|
| TS-01 — Auth ponta-a-ponta | US-F3-01, US-F3-02, US-F3-03 |
| TS-02 — correlationId Lambda → app | US-F3-01, US-F3-09 |
| TS-03 — Ciclo de OS com webhook falhando | US-06, US-11, US-13, US-14, US-F2-03, US-F3-09, US-F3-10, US-F3-11 |
| TS-04 — RDS indisponível | US-F3-04, US-F3-06, US-F3-10, US-F3-11 |
| TS-05 — Ordem de deploy entre repos | US-F3-04, US-F3-05, US-F3-08 |
| TS-06 — Idempotência do webhook inbound | US-F2-02, US-13 |

## Validation Checklist
- [ ] Os 6 cenários executados em um ambiente com os 4 repositórios integrados (não só unitário/isolado)
- [ ] TS-02 documentado como gap real, se confirmado, e comunicado ao grupo (decisão de propagar correlationId desde a Lambda)
- [ ] TS-04 e TS-05 executados somente após `feature/us-f3-04` estar mergeada em `main`
- [ ] Resultados registrados (print/log) como evidência pro vídeo de demonstração — vários destes cenários (auth ponta-a-ponta, ciclo de OS, dashboards reagindo a falha) são candidatos diretos ao roteiro do vídeo exigido na entrega (US-F3-12)

## Useful Commands
```bash
# Login e captura do JWT
curl -s -X POST {gateway}/auth -d '{"cpf":"..."}' -H "Content-Type: application/json"

# Decodificar JWT sem validar (inspecao manual do payload)
echo "<jwt>" | cut -d '.' -f2 | base64 -d 2>/dev/null | jq .

# Forcar falha do webhook outbound apontando pra um destino que nao responde
export NOTIFICATION_PROVIDER=webhook
export NOTIFICATION_WEBHOOK_URL=http://10.255.255.1/timeout
export NOTIFICATION_WEBHOOK_TIMEOUT_MS=3000

# Ver metricas de integracao expostas pelo app
curl -s {app_url}/metrics | grep integracao_resultados
```

## Nota
Plano criado a pedido do Gabriel para complementar a US-F3-DOC-07 com uma visão crítica de QA além do nível "um plano por história" — cobre os pontos de maior risco de efeito cascata identificados na investigação de git desta sessão (branches não mergeadas de F3-04 e F3-09, ausência de correlationId na Lambda, isolamento de falha do webhook). Não é um critério de aceite obrigatório da US-F3-DOC-07; é uma entrega extra de qualidade.
