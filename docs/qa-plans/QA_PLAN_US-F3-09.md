# QA Plan — US-F3-09: Logs Estruturados (JSON) com Correlacao de Requisicoes

## Summary

Valida o logger estruturado (`nestjs-pino`), a atribuicao/propagacao do correlation ID por requisicao (via `AsyncLocalStorage`), os campos padrao da linha de log, a redacao de dados sensiveis (CPF mascarado, token/senha nunca logados), o nivel de log por ambiente, o log de `DomainError`/erros nao tratados com contexto, e a propagacao do correlation ID para chamadas outbound (webhook de notificacao).

Codigo-fonte relevante: `src/shared/infrastructure/logging/` (contexto de correlacao, resolucao do ID, config do pino), `src/shared/infrastructure/correlation-id.middleware.ts`, `src/shared/infrastructure/domain-exception.filter.ts`, `src/notificacao/infrastructure/webhook-notificador.adapter.ts`, `src/main.ts`, `src/app.module.ts`.

## Prerequisites

- Node.js 20+ instalado
- Dependencias instaladas (`npm install`)
- `JWT_SECRET` definido (`.env` a partir de `.env.example`, ou export direto no shell)
- Para os cenarios manuais que so exercitam logging/correlation (health check, 400/401/403), a app sobe **sem banco** — Prisma so conecta na primeira query real
- Para os cenarios manuais que passam por rotas com banco (login, criacao de OS), suba o Postgres via `docker compose up -d db` (ou o compose completo) e rode `npm run seed`
- `jq` instalado, opcional, so facilita ler JSON nos cenarios manuais

## Test Scenarios

### TS-01: JSON estruturado em todos os ambientes
- **Type:** Manual
- **Acceptance criterion:** Logger estruturado emitindo JSON em todos os ambientes
- **Precondition:** App rodando localmente (`NODE_ENV=development`)
- **Steps:**
  1. `JWT_SECRET=<valor> NODE_ENV=development npx ts-node -r tsconfig-paths/register src/main.ts`
  2. Observar a saida do processo desde a primeira linha de boot
  3. `curl -s http://localhost:3000/health`
- **Expected result:** Toda linha impressa em `stdout` (boot e requisicao) e um objeto JSON valido de uma linha (`{"level":...,"time":...,...}`), sem texto solto/colorido
- **Alternative result (error):** Alguma linha em texto plano (ex.: formato default do `Logger` do Nest) indica que `app.useLogger(app.get(Logger))` nao foi aplicado ou rodou depois de algum log

### TS-02: correlationId gerado quando nenhum header de correlacao vem
- **Type:** Both
- **Acceptance criterion:** Correlation ID por requisicao — gera um quando ausente
- **Steps (automated):** `resolveCorrelationId({})` retorna UUID v4; `correlationIdMiddleware` com `headers: {}` seta `req.correlationId` no mesmo formato
- **Steps (manual):**
  1. `curl -s -D- http://localhost:3000/health -o /dev/null | grep -i x-correlation-id`
- **Expected result:** Header `x-correlation-id` presente na resposta, formato UUID v4

### TS-03: correlationId do cliente e preservado (X-Correlation-Id)
- **Type:** Both
- **Acceptance criterion:** Correlation ID por requisicao — aceita id do cliente/gateway
- **Steps (manual):**
  1. `curl -s -D- -H "X-Correlation-Id: meu-id-123" http://localhost:3000/health -o /dev/null | grep -i x-correlation-id`
- **Expected result:** Header de resposta `x-correlation-id: meu-id-123` (ecoa exatamente o enviado)

### TS-04: X-Request-Id como fallback
- **Type:** Both
- **Acceptance criterion:** Correlation ID por requisicao — aceita `X-Request-Id` do API Gateway
- **Steps (manual):**
  1. `curl -s -D- -H "X-Request-Id: lb-id-456" http://localhost:3000/health -o /dev/null | grep -i x-correlation-id`
- **Expected result:** Header de resposta `x-correlation-id: lb-id-456` (usado so quando `X-Correlation-Id` esta ausente)

### TS-05: traceparent (W3C Trace Context) como fallback e origem do traceId
- **Type:** Both
- **Acceptance criterion:** Correlation ID por requisicao — aceita `traceparent`; trace_id nos logs (US-F3-10)
- **Steps (manual):**
  1. `curl -s -D- -H "traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01" http://localhost:3000/health -o /dev/null | grep -i x-correlation-id`
  2. Conferir no `stdout` do servidor a linha de log dessa requisicao
- **Expected result:** `x-correlation-id: 4bf92f3577b34da6a3ce929d0e0e4736` (trace-id extraido do `traceparent`); a linha de log da requisicao tem `"traceId":"4bf92f3577b34da6a3ce929d0e0e4736"` igual ao `correlationId`

### TS-06: correlationId propagado em todos os logs da mesma requisicao (AsyncLocalStorage)
- **Type:** Both
- **Acceptance criterion:** Correlation ID propagado em todos os logs da requisicao
- **Steps (automated):** `correlation-context.spec.ts` prova isolamento entre execucoes concorrentes; `correlation-id.middleware.spec.ts` prova que o contexto esta disponivel dentro de `next()`, inclusive apos `await`
- **Steps (manual):**
  1. Disparar uma requisicao que gera mais de uma linha de log (ex.: `POST /auth/login` com credenciais invalidas, que loga tentativa + resultado)
  2. `grep` no stdout pelo `correlationId` retornado no header da resposta
- **Expected result:** Todas as linhas de log daquela requisicao (nao so a automatica de conclusao) trazem o mesmo `correlationId`

### TS-07: Campos padrao presentes na linha de log
- **Type:** Both
- **Acceptance criterion:** Campos padrao: timestamp, level, message, correlationId/traceId, method, path, statusCode, latencyMs, userId/role
- **Steps (automated):** `logger.module.spec.ts` — `customSuccessObject`/`customErrorObject` expõem `method`, `path`, `statusCode`, `userId`, `role`; `mixin` expõe `correlationId`/`traceId`
- **Steps (manual):**
  1. `curl -s http://localhost:3000/health -o /dev/null`
  2. Inspecionar a linha de log correspondente
- **Expected result:** Linha contem `time`, `level`, `msg`, `correlationId`, `traceId`, `method`, `path`, `statusCode`, `latencyMs`; nenhuma chave duplicada na mesma linha
- **Alternative result (error):** Chaves duplicadas (ex.: dois `statusCode`) indicam regressao no uso de `customProps` em vez de `customSuccessObject`/`customErrorObject`

### TS-08: correlationId propagado para chamada outbound (webhook de notificacao)
- **Type:** Both
- **Acceptance criterion:** Correlacao entre requisicoes/servicos — propagado para webhook/Lambda via header
- **Steps (automated):** `webhook-notificador.adapter.spec.ts` — `runWithCorrelation` + `enviar()` — assert `init.headers` contem `X-Correlation-Id`
- **Steps (manual):**
  1. Configurar `NOTIFICATION_PROVIDER=webhook` e `NOTIFICATION_WEBHOOK_URL` para uma URL de `https://webhook.site/`
  2. Disparar um fluxo que gera notificacao (ex.: completar diagnostico de uma OS) usando um `X-Correlation-Id` conhecido na requisicao inicial
  3. Conferir os headers recebidos no `webhook.site`
- **Expected result:** O POST recebido no webhook.site tem `X-Correlation-Id` igual ao da requisicao HTTP original que disparou o fluxo

### TS-09: Redacao de dados sensiveis (headers e CPF em mensagens)
- **Type:** Both
- **Acceptance criterion:** Sem dados sensiveis nos logs — mascarar CPF, nunca logar token/senha
- **Steps (automated):** `redact-sensitive-text.spec.ts` (mascara CPF/CNPJ em texto livre), `mask-cpf-cnpj.spec.ts`, paths de `redact-paths.ts` cobertos por `logger.module.spec.ts`
- **Steps (manual):**
  1. `curl -s -D- -H "Authorization: Bearer algum-token-falso" http://localhost:3000/auth/me -o /dev/null`
  2. Cadastrar um cliente e repetir o cadastro com o mesmo CPF (dispara `DuplicateCpfCnpjError`)
  3. Inspecionar as linhas de log correspondentes
- **Expected result:** Nenhuma linha de log contem o token em texto claro nem o CPF completo; a mensagem do `DomainError` de CPF duplicado aparece mascarada (ex.: `529******25`)

### TS-10: Nivel de log por ambiente
- **Type:** Both
- **Acceptance criterion:** Nivel de log por ambiente (`info` em prod, `debug` em dev) via env
- **Steps (automated):** `logger.module.spec.ts` — `buildPinoHttpOptions` com `NODE_ENV=development` -> `debug`; `NODE_ENV=production` -> `info`; `LOG_LEVEL` explicito tem precedencia; `NODE_ENV=test` -> `silent`
- **Steps (manual):**
  1. Subir a app com `NODE_ENV=production` (sem `LOG_LEVEL`) e checar que so aparecem linhas `level >= 30` (info+), sem `level:20` (debug)
  2. Subir com `LOG_LEVEL=warn` e checar que a linha de conclusao de uma requisicao 200 (normalmente `info`) some do stdout
- **Expected result:** Nivel efetivo respeita `LOG_LEVEL` > default por `NODE_ENV`

### TS-11: DomainError logado com contexto suficiente
- **Type:** Both
- **Acceptance criterion:** Erros nao tratados e `DomainError` logados com contexto suficiente (US-F3-11)
- **Steps (automated):** `domain-exception.filter.spec.ts` — mapeamento de status inalterado; verificar manualmente (leitura de codigo/teste novo) que `logger.warn` recebe `correlationId`, `kind`, `path`, `message` mascarada
- **Steps (manual):**
  1. Tentar cadastrar cliente com CPF invalido (`InvalidCpfCnpjError`, kind `INVALID_INPUT`) com um `X-Correlation-Id` conhecido
  2. Localizar a linha de log `"msg":"DomainError"`
- **Expected result:** Linha contem `correlationId` igual ao enviado, `kind:"INVALID_INPUT"`, `path` com metodo+rota, e `message` sem o CPF em texto claro

### TS-12: Erros nao tratados (5xx) tambem saem em JSON
- **Type:** Manual
- **Acceptance criterion:** Erros nao tratados logados com contexto suficiente
- **Precondition:** Alguma forma de forcar uma excecao nao mapeada (ex.: banco fora do ar em uma rota que depende de query)
- **Steps:**
  1. Derrubar o Postgres (`docker compose stop db`) com a app no ar
  2. `curl -s -D- http://localhost:3000/clientes -H "Authorization: Bearer $TOKEN"`
- **Expected result:** Resposta 500; no stdout, uma linha JSON de erro (nivel `error`) com `correlationId`, `statusCode:500` e mensagem/stack do erro — nao um stack trace texto-puro fora do JSON

### TS-13: Documentacao no README
- **Type:** Manual
- **Acceptance criterion:** Documentado no README (formato do log, como consultar por correlationId)
- **Steps:**
  1. Abrir `README.md`, secao "Logs estruturados e correlacao (US-F3-09)"
  2. Conferir que descreve o formato JSON, a origem/precedencia do correlationId e como filtrar logs por `correlationId`
- **Expected result:** Secao presente, exemplo de linha de log e instrucao de consulta por `correlationId` claros para alguem sem contexto previo

## Edge Cases

- Header `X-Correlation-Id` duplicado (array, ex. `?` de proxy) — usa o primeiro valor (`resolve-correlation-id.spec.ts`)
- `traceparent` mal formado (menos de 4 campos, trace-id com tamanho errado) — ignora e cai para o proximo fallback, nunca lanca excecao
- Duas requisicoes concorrentes nao vazam `correlationId` uma para a outra (`correlation-context.spec.ts` — cenario de `Promise.all`)
- `DomainError` com `kind` desconhecido (nao mapeado em `HTTP_EXCEPTION_BY_KIND`) — ainda loga com contexto e cai no fallback 400
- Log de erro sem `request` disponivel no `ArgumentsHost` (ex.: chamada direta fora de contexto HTTP) — `domain-exception.filter.ts` usa `ctx.getRequest?.()` opcional, nao quebra
- CPF em formato cru (11/14 digitos) e no formato `999.999.999-99` — ambos mascarados por `redactSensitiveText`
- `NODE_ENV=test` — logger fica `silent` e `autoLogging` desativado, para nao poluir a saida dos testes automatizados

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| Logger estruturado (JSON) em todos os ambientes | TS-01, TS-07 |
| Correlation ID por requisicao (aceita X-Request-Id/traceparent ou gera um) | TS-02, TS-03, TS-04, TS-05 |
| Campos padrao (timestamp, level, message, correlationId/traceId, method, path, statusCode, latencyMs, userId/role) | TS-05, TS-07 |
| Correlacao entre requisicoes/servicos (propagado para webhook/Lambda) | TS-08 |
| Sem dados sensiveis (CPF mascarado, token/senha nunca logados) | TS-09 |
| Nivel de log por ambiente via env | TS-10 |
| Integracao com backend de observabilidade — trace_id nos logs | TS-05 |
| Erros nao tratados e DomainError logados com contexto | TS-11, TS-12 |
| Testes garantindo formato JSON e presenca do correlationId | TS-01, TS-02, TS-06, TS-07 (automatizados) |
| Documentado no README | TS-13 |

## Validation Checklist

- [x] Todos os criterios de aceite cobertos
- [x] Edge cases documentados
- [x] Fluxos de erro documentados
- [x] Instrucoes de setup claras

## Useful Commands

```bash
# Rodar toda a suite unitaria (inclui os specs desta US)
npx jest --config jest.unit.config.ts

# Rodar so os specs de logging/correlacao
npx jest --config jest.unit.config.ts src/shared/infrastructure/logging src/shared/infrastructure/correlation-id.middleware.spec.ts src/shared/infrastructure/domain-exception.filter.spec.ts src/notificacao/infrastructure/webhook-notificador.adapter.spec.ts

# Rodar com cobertura
npm run test:unit:cov

# Subir a app localmente para os cenarios manuais (sem Docker, sem banco)
JWT_SECRET=<valor-qualquer-32-chars> NODE_ENV=development npx ts-node -r tsconfig-paths/register src/main.ts

# Subir tudo via Docker (necessario para TS-08, TS-11 completo, TS-12)
docker compose up -d --build
npm run seed
```
