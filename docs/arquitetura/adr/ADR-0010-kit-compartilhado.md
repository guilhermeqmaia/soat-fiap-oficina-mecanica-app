# ADR-0010: Kit compartilhado `@soat-fiap/oficina-kit`

**Status:** Aceita
**Data:** 2026-09-30

## Contexto

Três serviços NestJS precisam do mesmo que o monólito da Fase 3 já tem:
validação do JWT da Lambda, logs JSON com correlação, `/metrics`, `/health`,
tracing, e agora mensageria, outbox e consumidor idempotente
([ADR-0009](ADR-0009-outbox-e-consumidor-idempotente.md)). Copiar e colar três
vezes diverge em semanas. Mercado Livre pagou caro pela "liberdade caótica"
antes da Fury; o Nubank cita "every service is similar" como o que permite
pessoas trocarem de time.

## Decisão

- Pacote npm **`@soat-fiap/oficina-kit`** no repositório `soat-fiap-oficina-kit`,
  publicado no **GitHub Packages**, versionado por **semver** com CHANGELOG.
- **Entra no kit:** `AuthModule` (resource server: `JwtStrategy`, `AuthenticatedUser`,
  `RolesGuard`, decorators), `ObservabilityModule` (Pino + correlation-id, prom-client,
  health, dd-trace opcional, tracer-bridge), `MessagingModule` (publisher SNS com
  envelope, consumer SQS com dedup e DLQ), `OutboxModule` (adaptadores Prisma e
  DynamoDB Streams), `contracts/` (schemas JSON gerados do AsyncAPI), `testing/`
  (`mintToken`, fakes de broker).
- **Não entra:** nada de domínio (entidades, casos de uso, DTOs de negócio), nada
  de configuração de deploy.
- **Template de serviço** (`templates/service/`) com estrutura Clean Architecture,
  `architecture.spec.ts`, Dockerfile, `k8s-aws/`, workflows e `sonar-project.properties`.
- Mudanças **incompatíveis** no kit exigem major e PR nos três serviços; o CI de
  cada serviço fixa a versão (`^x.y`).

## Consequências

- Serviços novos nascem com auth, observabilidade e mensageria em minutos;
  revisão de PR foca em domínio.
- O kit vira dependência crítica: cobertura ≥ 80 %, SonarCloud e testes de
  contrato próprios; qualquer bug afeta os três — por isso releases pequenas.
- `src/auth/`, `src/observabilidade/` e `src/shared/infrastructure/` do monólito
  são **movidos** para o kit na [US-F4-01](../../user-stories/f4-01-kit-compartilhado.md)
  e o OS Service passa a consumi-los.
