# QA Plan — US-F3-09: Logs Estruturados (JSON) com Correlacao de Requisicoes

## Summary
Valida o logger estruturado (JSON), o correlation ID por requisicao (aceito do gateway ou gerado), os campos padrao de log, a propagacao do id para chamadas outbound, a mascara de dados sensiveis (CPF/token/senha nunca em log) e a correlacao com traces (`trace_id`).

## Prerequisites
- App rodando localmente (`docker compose up -d && npm run start:dev`)
- Acesso aos logs no stdout (dev) ou no backend de observabilidade configurado (Datadog Logs / Grafana Loki, conforme ambiente)
- Cliente HTTP para inspecionar headers de resposta (`curl -v`)

## Test Scenarios

### TS-01: Logs emitidos em JSON em todos os ambientes
- **Type:** Automated (unit/integration) / Manual
- **Steps:**
  1. Disparar uma requisicao qualquer e capturar a saida de log (stdout ou coletor)
  2. `JSON.parse()` de cada linha de log
- **Expected result:** Toda linha de log e um JSON valido, em dev/homolog/prod

### TS-02: Correlation ID aceito do gateway (X-Request-Id/traceparent)
- **Type:** Automated (integration)
- **Acceptance criterion:** Aceita X-Request-Id/traceparent do API Gateway ou gera um
- **Steps:**
  1. `curl {app_url}/health -H "X-Request-Id: teste-123"`
  2. Verificar nos logs da requisicao que `correlationId`/`traceId` = `teste-123`
- **Expected result:** ID recebido e propagado, nao sobrescrito

### TS-03: Correlation ID gerado quando ausente
- **Type:** Automated (integration)
- **Steps:**
  1. `curl {app_url}/health` sem header de correlacao
  2. Verificar log da requisicao com um ID gerado (formato UUID ou similar)
- **Expected result:** ID sempre presente, gerado quando o cliente/gateway nao envia

### TS-04: Campos padrao presentes em todo log de requisicao
- **Type:** Automated (unit)
- **Acceptance criterion:** timestamp, level, message, correlationId/traceId, method, path, statusCode, latencyMs, userId/role
- **Steps:**
  1. Inspecionar um log de requisicao autenticada e um anonimo
- **Expected result:** Todos os campos presentes; `userId`/`role` ausentes (nao "null" ruidoso) quando nao houver usuario autenticado

### TS-05: Correlacao propagada para chamadas outbound
- **Type:** Automated (integration) / Manual
- **Acceptance criterion:** Id propagado para webhook de notificacao e Lambda via header
- **Steps:**
  1. Disparar um fluxo que aciona o webhook de notificacao (ex.: aprovacao de orcamento) com um `X-Request-Id` conhecido
  2. Inspecionar a requisicao outbound (mock/log do webhook) e confirmar o mesmo id no header
- **Expected result:** Mesmo correlationId de ponta a ponta (app -> webhook)

### TS-06: Dados sensiveis nunca aparecem nos logs
- **Type:** Automated (unit) / Manual
- **Acceptance criterion:** Mascarar CPF, nunca logar token/senha
- **Steps:**
  1. Autenticar e disparar requisicoes que manipulam CPF (ex.: `GET /auth/me`)
  2. Inspecionar logs em busca de CPF completo, JWT completo ou senha em texto plano
  3. `grep -riE "senha|password|bearer [a-z0-9._-]{20,}"` na saida de log capturada
- **Expected result:** Nenhum dado sensivel em texto plano; CPF mascarado quando aparecer

### TS-07: Nivel de log por ambiente
- **Type:** Manual/config
- **Steps:**
  1. Rodar com `NODE_ENV=production` (ou variavel equivalente) e confirmar nivel `info`
  2. Rodar em dev e confirmar nivel `debug`
- **Expected result:** Verbosidade correta por ambiente, configuravel via env

### TS-08: Correlacao com traces (trace_id nos logs)
- **Type:** Manual — depende de [QA_PLAN_US-F3-10](QA_PLAN_US-F3-10.md)
- **Steps:**
  1. Com `DD_TRACE_ENABLED=true`, disparar uma requisicao e localizar o trace correspondente no APM
  2. Confirmar que o `trace_id` do span bate com o `trace_id` presente no log da mesma requisicao
- **Expected result:** Log <-> trace correlacionados (log injection do `dd-trace`, ver `tracing.ts`)

### TS-09: Erros nao tratados logados com contexto suficiente
- **Type:** Automated (unit/integration)
- **Acceptance criterion:** Contexto suficiente para o alerta de falha de OS (US-F3-11)
- **Steps:**
  1. Forcar um erro nao tratado num fluxo de OS (ex.: transicao de status invalida)
  2. Inspecionar o log de erro — deve conter `correlationId`, rota, `OsId`/numero da OS, stack (em nivel apropriado)
- **Expected result:** Log de erro acionavel, suficiente para o alerta "falha no processamento de ordens de servico" apontar a causa

### TS-10: Testes garantindo formato e correlationId
- **Type:** Automated (unit)
- **Steps:**
  1. Rodar a suite de testes do logger/interceptor de correlacao
- **Expected result:** Testes cobrindo presenca de JSON valido e do campo de correlacao passam

### TS-11: README documenta formato do log e consulta por correlationId
- **Type:** Manual
- **Acceptance criterion:** Documentado no README (formato do log, como consultar por correlationId)
- **Steps:**
  1. Abrir o README do repo `soat-fiap-oficina-mecanica-app` (secao de observabilidade/logs)
  2. Confirmar que documenta o formato do log (JSON, campos padrao) e como consultar por correlationId
- **Expected result:** README documenta claramente formato do log e o processo de consulta por correlationId

## Edge Cases
- Requisicao concorrente com o mesmo `X-Request-Id` enviado por engano por dois clientes — nao deve causar confusao entre logs (o id e por requisicao HTTP, nao global)
- Header `X-Request-Id` malicioso/muito longo — deve ser truncado/sanitizado, nao quebrar o logger
- Falha do proprio pipeline de logging (ex.: disco cheio em dev) — nao deve derrubar a aplicacao

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| Logger estruturado emitindo JSON | TS-01 |
| Correlation ID aceito ou gerado | TS-02, TS-03 |
| Campos padrao | TS-04 |
| Correlacao entre servicos (outbound) | TS-05 |
| Sem dados sensiveis nos logs | TS-06 |
| Nivel de log por ambiente | TS-07 |
| Trace correlation | TS-08 |
| Erros logados com contexto para alertas | TS-09 |
| Testes de formato/correlationId | TS-10 |
| Documentado no README (formato do log, consulta por correlationId) | TS-11 |

## Validation Checklist
- [ ] Todos os criterios de aceite cobertos
- [ ] Edge cases documentados
- [ ] Fluxos de erro documentados
- [ ] Instrucoes de setup claras

## Useful Commands
```bash
npm run test:unit
npm run test:integration
curl -v {app_url}/health -H "X-Request-Id: teste-123"
docker compose logs -f app | jq .
```
