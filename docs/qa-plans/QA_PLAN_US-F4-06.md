# QA Plan — US-F4-06: OS Service — Evolucao do Monolito (Strangler)

## Resumo
Valida o monolito da Fase 3 reduzido ao **OS Service**: catalogo/estoque/execucao e orcamento/aprovacao sairam; a OS guarda um snapshot dos itens recebido por evento; novo status `AGUARDANDO_PAGAMENTO` e `motivoCancelamento`; API reduzida a abertura, consulta, entrega e cancelamento; transicoes idempotentes dirigidas por eventos; audit log alimentado por toda mudanca de status.

Entregue em 3 PRs: **PR 1** dominio/API/banco (cenarios TS-01..TS-10), **PR 2** outbox + consumidores SQS (TS-11..TS-13), **PR 3** NodePort + rename do repositorio (TS-14..TS-15).

## Pre-requisitos
- Docker (testcontainers para integracao/e2e); `npm ci && npx prisma generate`
- Banco com as migrations ate `20261020200000_os_service_fase4` (`npx prisma migrate deploy`)
- Seeds `01..03` e `05` (a `04_metricas_tempo` foi removida: dependia das colunas de execucao)
- Tokens por role via `mintToken` do kit (`@guilhermeqmaia/oficina-kit/testing`)

## Cenarios de Teste

### TS-01: Modulos de catalogo/estoque removidos
- **Tipo:** Automatizado (`npm run test:unit`)
- **Criterio:** Modulos `produto`/`servico` e casos de uso de execucao/orcamento removidos
- **Passos:** `ls src/produto src/servico` (nao existem); `GET /servicos` e `GET /produtos` com token ADMIN
- **Resultado esperado:** 404 em ambos; `architecture.spec` verde (dominio/aplicacao so importam o kit `/core` e `/auth`)

### TS-02: Migration do banco (snapshot sem FK)
- **Tipo:** Automatizado (integracao sobe banco limpo e aplica todas as migrations)
- **Criterio:** Schema do OS Service
- **Passos:** `npx prisma migrate deploy` num banco da Fase 3 com OS e itens existentes
- **Resultado esperado:** tabelas `servico`, `produto`, `movimentacao_estoque` removidas; itens ganham `nome` (backfill `''` para linhas antigas); colunas de execucao removidas; enum ganha `AGUARDANDO_PAGAMENTO`; `ordem_de_servico.motivo_cancelamento`

### TS-03: Maquina de estados completa
- **Tipo:** Automatizado (`ordem-de-servico.entity.spec.ts`)
- **Criterio:** `AGUARDANDO_PAGAMENTO` entre aprovacao e execucao; cancelamento com motivo
- **Passos:** percorrer RECEBIDA -> EM_DIAGNOSTICO -> AGUARDANDO_APROVACAO -> AGUARDANDO_PAGAMENTO -> EM_EXECUCAO -> FINALIZADA -> ENTREGUE; tentar pular etapas; cancelar de cada status
- **Resultado esperado:** caminho feliz passa; pular etapa lanca `InvalidStatusTransitionError`; cancelar so antes de EM_EXECUCAO e grava `motivoCancelamento`

### TS-04: Snapshot do diagnostico
- **Tipo:** Automatizado (entity + `transicoes.use-case.spec.ts`)
- **Criterio:** Itens vem por evento com nome e preco congelados
- **Passos:** `RegistrarDiagnosticoUseCase.execute` com itens SERVICO/PRODUTO (produto com `servicoId` e sem)
- **Resultado esperado:** produtos agrupados sob o servico pai; sem pai caem em "Pecas avulsas"; totais corretos; reaplicar substitui o snapshot (nao duplica)

### TS-05: Transicoes idempotentes e fora de ordem
- **Tipo:** Automatizado (`transicoes.use-case.spec.ts`, e2e)
- **Criterio:** Consumidores idempotentes (ADR-0009)
- **Passos:** executar a mesma transicao duas vezes; executar `execucao.finalizada` numa OS ENTREGUE
- **Resultado esperado:** reentrega nao grava nem publica; evento incompativel lanca (vai para a DLQ no PR 2) e a OS nao muda

### TS-06: API reduzida
- **Tipo:** Automatizado (`ordem-de-servico.e2e.spec.ts`)
- **Criterio:** Endpoints de mutacao removidos; `cancelar` novo
- **Passos:** `POST /ordens-servico/:id/atribuir-mecanico|completar-diagnostico|aprovar|servicos` -> 404; `POST /ordens-servico/:id/cancelar` (ATENDENTE) -> 201 CANCELADA/OPERADOR; repetir -> 400; motivo invalido -> 400; MECANICO/CLIENTE -> 403
- **Resultado esperado:** conforme acima; Swagger em `/api` sem as rotas removidas

### TS-07: Abertura sem itens
- **Tipo:** Automatizado (e2e)
- **Criterio:** OS nasce RECEBIDA e vazia
- **Passos:** `POST /ordens-servico` com `{clienteId, veiculoId, descricaoInicial}` (campo `servicos` ignorado)
- **Resultado esperado:** 201, `itensServico: []`, `mecanicoId: null`, `valorTotal: 0`; 404/409/400 para cliente/veiculo/descricao invalidos

### TS-08: Consultas usam o snapshot (sem catalogo)
- **Tipo:** Automatizado (e2e + `os.use-cases.spec.ts`)
- **Criterio:** Historico/auditoria, consulta por CPF, status publico
- **Passos:** `GET /ordens-servico/numero/:numero/status` (publico), `GET /ordens-servico/:id`, `GET /clientes/:cpf/ordens-servico` com token CLIENTE
- **Resultado esperado:** nomes/precos vem do snapshot; `motivoCancelamento` exposto; detalhe traz mecanico por nome

### TS-09: Audit log alimentado por toda transicao
- **Tipo:** Automatizado (e2e "5. audit log")
- **Criterio:** Historico/auditoria de status
- **Passos:** percorrer o ciclo via use cases de transicao e `GET /ordens-servico/:id/audit-log`
- **Resultado esperado:** uma linha por mudanca (`acao` = `ANTERIOR -> NOVO`, `metadata.motivoCancelamento` quando houver)

### TS-10: Cobertura
- **Tipo:** Automatizado (`npm run test:unit:cov`, `npm run test:integration`)
- **Criterio:** >= 80%
- **Resultado esperado:** gate verde (PR 1: 94% linhas / 82% branches no unitario; 179 testes de integracao/e2e)

### TS-11: Outbox transacional dos eventos `os.*`
- **Tipo:** Automatizado (e2e "mensageria"; `prisma-ordem-de-servico.repository.spec.ts`)
- **Criterio:** Publica via outbox `os.aberta`, `os.cancelada`, `os.finalizada`, `os.entregue`
- **Passos:** `POST /ordens-servico`; `POST :id/cancelar`; percorrer ate ENTREGUE; `SELECT type, status, envelope FROM outbox WHERE correlation_id = <numero>`
- **Resultado esperado:** uma linha PENDENTE por evento, na ordem; `os.aberta` traz cliente (nome, `cpfMascarado`) e veiculo (placa, modelo) e nunca o CPF completo; transicoes intermediarias nao geram `os.*`; `gravar` recebe o mesmo `tx` da OS (unitario)

### TS-12: Handlers da fila `os-eventos`
- **Tipo:** Automatizado (`eventos.handlers.spec.ts`; e2e "handlers traduzem o contrato")
- **Criterio:** Consome `execucao.*` e `billing.*` com idempotencia
- **Passos:** entregar envelopes AsyncAPI aos handlers (`execucao.enfileirada` -> `diagnostico-concluido` -> `billing.orcamento-gerado`; `execucao.recusada`)
- **Resultado esperado:** status/snapshot da OS seguem o contrato; 12 types cobertos sem duplicata; compensacoes cancelam com o motivo correto (`EXECUCAO_RECUSADA`, `ORCAMENTO_REJEITADO`, `PAGAMENTO_RECUSADO`); OS inexistente/evento incompativel lancam (sem ack -> retry -> DLQ)

### TS-13: Ponta a ponta com LocalStack
- **Tipo:** Manual
- **Criterio:** OutboxPoller -> SNS -> SQS -> consumer
- **Passos:** `docker compose --profile messaging up -d localstack`; `.env` com `AWS_ENDPOINT`/`SNS_TOPIC_ARN`/`SQS_QUEUE_URL`; `npm run start:dev`; `POST /ordens-servico`; `awslocal sqs receive-message --queue-url .../notificacao-eventos.fifo`; publicar `execucao.enfileirada` em `oficina-execucao.fifo` com `awslocal sns publish --message-group-id <numero> --message-deduplication-id <uuid>`
- **Resultado esperado:** linha do outbox vira ENVIADA; `os.aberta` chega na fila de notificacao; a OS vai para EM_DIAGNOSTICO e o id entra em `processed_messages`; republicar o mesmo envelope nao reprocessa (log `duplicate: true`)

### TS-14..TS-15 (PR 3): Service NodePort 30080 atras do NLB unico (US-F4-05 TS-06); repositorio renomeado com CI/CD verde — *a preencher no PR 3*

## Casos de Borda
- Itens antigos (pre-migration) ficam com `nome = ''` — exibidos como vazio ate o Execucao reemitir o diagnostico
- `RegistrarDiagnostico` com `precoUnitario` string (`"200.00"`) ou number — ambos aceitos
- Cancelamento manual durante `AGUARDANDO_PAGAMENTO` e permitido (compensacao no Billing via evento, PR 2)
- Listagem ordena `EM_EXECUCAO > AGUARDANDO_PAGAMENTO > AGUARDANDO_APROVACAO > EM_DIAGNOSTICO > RECEBIDA`

## Rastreabilidade
| Criterio | Cenarios |
|---|---|
| Modulos removidos; architecture.spec | TS-01 |
| Cliente, Veiculo, auditoria, CPF, tempo por status | TS-08, TS-09 |
| `AGUARDANDO_PAGAMENTO` + maquina de estados | TS-03 |
| Publica via outbox | TS-11 (PR 2) |
| Consome eventos, idempotente | TS-04, TS-05, TS-12 (PR 2) |
| Endpoints de mutacao removidos; Swagger | TS-06, TS-07 |
| Notificacao continua por eventos | US-F4-12 |
| Kit, cobertura, rename | TS-10, TS-14, TS-15 (PR 3) |

## Checklist de Validacao
- [x] TS-01..TS-10 (20/10/2026, PR 1)
- [x] TS-11, TS-12 (20/10/2026, PR 2)
- [ ] TS-13 — manual com LocalStack (ou no EKS apos PR 3)
- [ ] TS-14..TS-15 (PR 3)
