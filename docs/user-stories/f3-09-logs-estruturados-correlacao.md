# US-F3-09: Logs Estruturados (JSON) com Correlacao de Requisicoes

**User Story:** Como time de operacao, quero logs estruturados em JSON com um id de correlacao por requisicao, para rastrear uma requisicao ponta-a-ponta (gateway -> app -> banco) e diagnosticar incidentes rapidamente.

**Prioridade:** Alta
**Story Points:** 3
**Status:** To Do
**DDD Domain:** Observabilidade
**DDD Layer:** Infrastructure
**Repositorio:** 4 — `soat-fiap-oficina-mecanica-app`

## Criterios de Aceite

- [ ] Logger estruturado (ex.: `nestjs-pino` / `pino`) emitindo **JSON** em todos os ambientes
- [ ] **Correlation ID** por requisicao: aceita `X-Request-Id`/`traceparent` do API Gateway ou gera um; propagado em todos os logs da requisicao
- [ ] Campos padrao: `timestamp`, `level`, `message`, `correlationId`/`traceId`, `method`, `path`, `statusCode`, `latencyMs`, `userId`/`role` (quando houver)
- [ ] Correlacao **entre requisicoes/servicos**: id propagado para chamadas outbound (webhook de notificacao, Lambda) via header
- [ ] **Sem dados sensiveis** nos logs (mascarar CPF, nunca logar token/senha) — redaction configurada
- [ ] Nivel de log por ambiente (`info` em prod, `debug` em dev) via env
- [ ] Integracao com o backend de logs da observabilidade ([f3-10](f3-10-observabilidade-apm.md)) com **trace correlation** (trace_id nos logs)
- [ ] Erros nao tratados e `DomainError` logados com contexto suficiente para o alerta de falha de OS ([f3-11](f3-11-dashboards-alertas.md))
- [ ] Testes garantindo formato JSON e presenca do correlationId
- [ ] Documentado no README (formato do log, como consultar por correlationId)
