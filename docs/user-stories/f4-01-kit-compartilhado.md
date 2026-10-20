# US-F4-01: Kit Compartilhado dos Servicos (`@guilhermeqmaia/oficina-kit`)

**User Story:** Como Desenvolvedor de um microsservico, quero um pacote compartilhado com autenticacao, logs, metricas, mensageria e outbox prontos, para que os tres servicos nasçam iguais e eu escreva apenas codigo de dominio.

**Prioridade:** Alta
**Story Points:** 8
**Status:** Em andamento — v0.1.0 e v0.2.0 (mensageria/outbox/LocalStack) entregues; monolito consome o kit (PR #81); falta o template de servico
**DDD Domain:** Transversal (nenhum dominio)
**DDD Layer:** Infrastructure (biblioteca)
**Repositorio:** novo — `soat-fiap-oficina-kit`

## Contexto

Licao do Mercado Livre (Fury) e do Nubank ("every service is similar"):
padronizar o que nao e dominio evita que tres times reinventem auth, logs e
mensageria de tres jeitos. O kit extrai o que a Fase 3 ja provou no monolito.

## Criterios de Aceite

- [x] Pacote `@guilhermeqmaia/oficina-kit` publicado no **npmjs.org** (ver ADR-0010, revisão 19/10), semver, CHANGELOG — v0.1.0 (repo [soat-fiap-oficina-kit](https://github.com/guilhermeqmaia/soat-fiap-oficina-kit))
- [x] `AuthModule` (resource server): `JwtStrategy` (HS256, `iss=oficina-auth-lambda`), `AuthenticatedUser`, `RolesGuard`, decorators `@Public/@Roles/@CurrentUser` — extraidos de `src/auth/` do monolito (`AuthModule.forRoot/forRootAsync`; o monolito consome na v0.1.0)
- [x] `ObservabilityModule`: Pino JSON + `x-correlation-id`, `/metrics` (prom-client), `/health`, `dd-trace` opcional, `tracer-bridge` — entregue como `LoggerModule`, `MetricsModule` e `HealthModule` (`forRoot`); o servico e identificado pelo **label `service`** em todas as series (em vez de prefixo por servico — mantem os nomes `oficina_*` dos dashboards da Fase 3)
- [x] `MessagingModule`: publisher SNS com envelope padrao (ADR-0009) e propagacao de `traceparent`/`correlationId` em message attributes; consumer SQS (long polling, batch, visibilidade, DLQ) com **deduplicacao por `messageId`** (tabela/collection `processed_messages`) — v0.2.0 (`criarEnvelope`, `SnsPublisher`, `SqsConsumer`, `MessagingModule.forRoot`)
- [x] `OutboxModule`: tabela `outbox` + poller com lock; adaptador Prisma (Postgres) e adaptador DynamoDB (Streams) documentados — v0.2.0 (`OutboxPublisher`, `OutboxPoller` com varreduras nao sobrepostas, `PrismaOutboxRepository`/`PrismaProcessedMessageStore` com schema documentado). Adapter DynamoDB Streams fica com a [US-F4-07](f4-07-execucao-service.md)
- [x] Emulacao local: LocalStack (SNS/SQS/DynamoDB) via compose de referencia — `docker-compose.localstack.yml` + `scripts/messaging-local.sh` (topologia da RFC-0006)
- [x] Testes unitarios >= 80% e SonarCloud no CI do kit — 116 testes, 99,6% linhas / 92% branches; job do Sonar pronto, ativa com o `SONAR_TOKEN` (US-F4-13)
- [ ] Template de servico (`templates/service/`) usado por [US-F4-04](f4-04-repos-e-cicd-por-servico.md)
## Dependencias

- [US-F4-DOC-02](f4-doc-02-adrs.md) (ADR-0009/0010)
