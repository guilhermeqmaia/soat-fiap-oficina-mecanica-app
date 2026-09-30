# US-F4-01: Kit Compartilhado dos Servicos (`@soat-fiap/oficina-kit`)

**User Story:** Como Desenvolvedor de um microsservico, quero um pacote compartilhado com autenticacao, logs, metricas, mensageria e outbox prontos, para que os tres servicos nasçam iguais e eu escreva apenas codigo de dominio.

**Prioridade:** Alta
**Story Points:** 8
**Status:** To Do
**DDD Domain:** Transversal (nenhum dominio)
**DDD Layer:** Infrastructure (biblioteca)
**Repositorio:** novo — `soat-fiap-oficina-kit`

## Contexto

Licao do Mercado Livre (Fury) e do Nubank ("every service is similar"):
padronizar o que nao e dominio evita que tres times reinventem auth, logs e
mensageria de tres jeitos. O kit extrai o que a Fase 3 ja provou no monolito.

## Criterios de Aceite

- [ ] Pacote `@soat-fiap/oficina-kit` publicado no **GitHub Packages** (npm), semver, CHANGELOG
- [ ] `AuthModule` (resource server): `JwtStrategy` (HS256, `iss=oficina-auth-lambda`), `AuthenticatedUser`, `RolesGuard`, decorators `@Public/@Roles/@CurrentUser` — extraidos de `src/auth/` do monolito
- [ ] `ObservabilityModule`: Pino JSON + `x-correlation-id`, `/metrics` (prom-client, prefixo `oficina_<servico>_`), `/health`, `dd-trace` opcional, `tracer-bridge`
- [ ] `MessagingModule`: publisher SNS com envelope padrao (ADR-0009) e propagacao de `traceparent`/`correlationId` em message attributes; consumer SQS (long polling, batch, visibilidade, DLQ) com **deduplicacao por `messageId`** (tabela/collection `processed_messages`)
- [ ] `OutboxModule`: tabela `outbox` + poller com lock; adaptador Prisma (Postgres) e adaptador DynamoDB (Streams) documentados
- [ ] Emulacao local: LocalStack (SNS/SQS/DynamoDB) via compose de referencia
- [ ] Testes unitarios >= 80% e SonarCloud no CI do kit
- [ ] Template de servico (`templates/service/`) usado por [US-F4-04](f4-04-repos-e-cicd-por-servico.md)
## Dependencias

- [US-F4-DOC-02](f4-doc-02-adrs.md) (ADR-0009/0010)
