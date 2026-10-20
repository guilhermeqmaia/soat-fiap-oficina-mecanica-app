# QA Plan — US-F4-01: Kit Compartilhado dos Servicos (`@guilhermeqmaia/oficina-kit`)

## Resumo
Valida que o que e comum aos microsservicos e nao e dominio (auth resource server, logs com correlacao, metricas, health, mensageria SNS/SQS com envelope, outbox transacional, consumidor idempotente, fakes de teste) vive num pacote npm publicado, que o monolito o consome sem perder comportamento, e que o template de servico gera um microsservico pronto para CI/CD.

## Pre-requisitos
- Repos: `soat-fiap-oficina-kit` (kit) e `soat-fiap-oficina-mecanica-app` (consumidor); Node 20, Docker (testcontainers/LocalStack)
- Pacote publicado: `npm view @guilhermeqmaia/oficina-kit versions` lista `0.1.0` e `0.2.0`
- Nao e necessario token npm para instalar (registry publico)

## Cenarios de Teste

### TS-01: Pacote publicado e instalavel sem credenciais
- **Tipo:** Manual
- **Criterio:** Pacote publicado no npmjs.org, semver, CHANGELOG
- **Passos:**
  1. `mkdir /tmp/x && cd /tmp/x && npm init -y >/dev/null && npm i @guilhermeqmaia/oficina-kit`
  2. `node -e "console.log(Object.keys(require('@guilhermeqmaia/oficina-kit/auth')))"`
  3. Conferir `CHANGELOG.md` do kit com as secoes 0.1.0 e 0.2.0
- **Resultado esperado:** instala sem `.npmrc`/token; exports de `AuthModule`, `JwtStrategy`, `Role`...; changelog descreve cada versao

### TS-02: Smoke de instalacao do tarball (8 subpaths)
- **Tipo:** Automatizado
- **Criterio:** `exports` por subpath e `files` corretos
- **Passos:** no kit, `npm run pack:smoke`
- **Resultado esperado:** `smoke ok: 8 subpaths importaveis` (`.`, `/core`, `/auth`, `/logging`, `/metrics`, `/health`, `/messaging`, `/testing`)

### TS-03: Resource server (AuthModule) num Nest real
- **Tipo:** Automatizado
- **Criterio:** `JwtStrategy` HS256 + `iss=oficina-auth-lambda`, guards globais, decorators
- **Passos:** no kit, `npx jest src/kit-modules.spec.ts`
- **Resultado esperado:** `@Public` sem token 200; sem token 401; token valido 200 com `AuthenticatedUser` nas claims; issuer diferente 401; `@Roles` 403/200; `AuthModule.forRoot({ secret: '' })` falha no boot

### TS-04: Logs com correlacao e campo `service`
- **Tipo:** Automatizado
- **Criterio:** Pino JSON + `x-correlation-id`, `tracer-bridge`
- **Passos:** `npx jest src/logging`
- **Resultado esperado:** `buildPinoHttpOptions` com `base.service`, `mixin` com `correlationId`/`traceId` (e `dd.*` com APM), redacao de headers/segredos; middleware devolve `x-correlation-id`

### TS-05: `/metrics` e `/health` com label/indicador do servico
- **Tipo:** Automatizado
- **Criterio:** `/metrics` (prom-client), `/health`, `dd-trace` opcional
- **Passos:** `npx jest src/metrics src/health src/kit-modules.spec.ts`
- **Resultado esperado:** latencia medida pelo PADRAO da rota e pelo status FINAL; `service="<nome>"` em todas as series; `/health/ready` 200 com indicadores ok e 503 com o detalhe do que falhou; `iniciarTracing` no-op sem `DD_TRACE_ENABLED`

### TS-06: Envelope, SNS FIFO e consumidor idempotente
- **Tipo:** Automatizado
- **Criterio:** `MessagingModule` — publisher SNS com envelope (ADR-0009), consumer SQS com deduplicacao
- **Passos:** `npx jest src/messaging`
- **Resultado esperado:** `criarEnvelope` gera UUID v7, herda `correlationId`/`traceparent` do contexto e rejeita `type` fora de `<dominio>.<fato>`; `SnsPublisher` usa `MessageGroupId=correlationId`, `MessageDeduplicationId=id` e atributos `type/correlationId/producer/traceparent`; `SqsConsumer` processa uma vez, ignora duplicata (apaga da fila), NAO apaga em erro (reentrega → DLQ), desembrulha notificacao do SNS, executa o handler no contexto de correlacao da mensagem

### TS-07: Outbox transacional e poller
- **Tipo:** Automatizado
- **Criterio:** `OutboxModule`: tabela `outbox` + poller; adapters Prisma documentados
- **Passos:** `npx jest src/messaging/outbox src/messaging/messaging.module.spec.ts`
- **Resultado esperado:** `OutboxPublisher` grava na transacao (`tx`) e nao fala com o broker; `OutboxPoller` entrega em ordem, incrementa `tentativas` em falha e mantem PENDENTE, loga erro ao esgotar `maxTentativas`, varreduras nao se sobrepoem; fluxo ponta a ponta caso de uso → outbox → SNS (mock) → SQS (mock, duplicada) → handler tratado UMA vez; o comentario de `PrismaOutboxRepository` traz os modelos Prisma `Outbox`/`ProcessedMessage`

### TS-08: Emulacao local com LocalStack
- **Tipo:** Manual
- **Criterio:** LocalStack (SNS/SQS/DynamoDB) via compose de referencia
- **Passos:**
  1. no kit, `npm run localstack:up`
  2. `docker exec $(docker ps -qf name=localstack) awslocal sns list-topics` e `... awslocal sqs list-queues`
  3. `npm run localstack:down`
- **Resultado esperado:** topicos `oficina-{os,execucao,billing}.fifo`; filas `execucao-comandos`, `billing-comandos`, `os-eventos`, `notificacao-eventos` (+ `-dlq`), assinaturas com filtro por `type` (topologia da RFC-0006)

### TS-09: Cobertura >= 80% e CI do kit
- **Tipo:** Ambos
- **Criterio:** Testes unitarios >= 80% e SonarCloud no CI
- **Passos:** `npm run test:cov` no kit; conferir o workflow `CI` do ultimo PR
- **Resultado esperado:** gate de 80% em linhas/funcoes/branches/statements (jest.config.js); 163+ testes verdes; job `sonarcloud` presente (ativa com `SONAR_TOKEN` — US-F4-13)

### TS-10: Monolito consome o kit sem regressao
- **Tipo:** Automatizado
- **Criterio:** `AuthModule`/`ObservabilityModule` extraidos de `src/auth/` e `src/observabilidade/`
- **Passos:** no monolito, `npm ci && npx prisma generate && npx tsc --noEmit && npm run test:unit:cov && npm run test:integration`; `npm ls @nestjs/core passport prom-client nestjs-pino`
- **Resultado esperado:** 0 erros; 594 unit + 342 integracao verdes; `src/auth/` contem apenas `Usuario` + `GET /auth/me`; `src/observabilidade/` apenas metricas de negocio; peers deduplicadas (uma instancia); `architecture.spec.ts` impede dominio/aplicacao de importar `kit/logging|metrics|health|messaging`

### TS-11: Template gera um servico pronto
- **Tipo:** Ambos
- **Criterio:** Template de servico (`templates/service/`) usado pela US-F4-04
- **Passos:**
  1. no kit, `scripts/new-service.sh exemplo /tmp/svc 3009 30099 "Exemplo"`
  2. `cd /tmp/svc && npm install && npx prisma generate && npm run format && npm run lint && npm run typecheck && npm run test:unit:cov && npm run test:integration && npm run build && docker build -t svc:ci .`
- **Resultado esperado:** nenhum placeholder `__SERVICE*`/`__PORT__`/`__DB_NAME__` restante; unitarios acima de 80%; e2e com Postgres via testcontainers valida `/health`, `/health/ready` (banco proprio), `/metrics` (label `service`) e 401/404 com JWT; imagem builda; o job `template` do CI do kit executa esses mesmos passos a cada PR

### TS-12: Release por tag com Trusted Publishing
- **Tipo:** Manual
- **Criterio:** Publicacao automatizada
- **Passos:** `git tag vX.Y.Z && git push origin vX.Y.Z`; acompanhar `Release (npm)`
- **Resultado esperado:** workflow valida tag == `package.json`, roda testes e publica com `--provenance` via OIDC (sem secret `NPM_TOKEN`); versao aparece no registry em ate ~3 min

## Casos de Borda
- `criarEnvelope` sem `correlationId` e fora de requisicao → `EnvelopeInvalidoError`
- Mensagem com JSON invalido ou sem handler → nao e apagada (vai para a DLQ) e o loop continua
- Erro de rede no `ReceiveMessage` → log + espera 1 s + continua; `parar()` encerra o loop
- `OutboxPoller.varrer()` concorrente → segunda chamada devolve 0 (nao sobrepoe)
- `HealthModule.forRoot()` sem indicadores → `/health/ready` 200 com `checks: {}`
- Servico com `AuthModule.forRoot` e `@nestjs/throttler`: `/health` e `/metrics` precisam ser excluidos no `skipIf` (template ja faz)

## Rastreabilidade

| Criterio de aceite | Cenarios |
|---|---|
| Pacote publicado no npmjs.org, semver, CHANGELOG | TS-01, TS-02, TS-12 |
| `AuthModule` resource server extraido | TS-03, TS-10 |
| `ObservabilityModule` (logs, `/metrics`, `/health`, tracing) | TS-04, TS-05, TS-10 |
| `MessagingModule` (SNS + SQS idempotente) | TS-06 |
| `OutboxModule` + adapters | TS-07 |
| LocalStack via compose | TS-08 |
| Testes >= 80% e SonarCloud no CI | TS-09 |
| Template de servico | TS-11 |

## Checklist de Validacao
- [ ] TS-01..TS-12 executados
- [ ] `npm run test:cov` do kit >= 80% (163+ testes)
- [ ] Monolito: 594 unit + 342 integracao verdes com o kit do registry
- [ ] Servico gerado pelo template builda e passa nos testes
- [ ] Nenhum token npm armazenado (secret `NPM_TOKEN` ausente; Trusted Publishing ativo)

## Comandos Uteis
```bash
npm view @guilhermeqmaia/oficina-kit versions dist-tags
cd soat-fiap-oficina-kit && npm run test:cov && npm run pack:smoke
scripts/new-service.sh exemplo /tmp/svc 3009 30099 "Exemplo"
```
