# QA Plan — US-F3-09: Logs Estruturados (JSON) com Correlacao de Requisicoes

## Resumo
Valida o logger `nestjs-pino`: JSON em todos os ambientes, `correlationId`/`traceId` por requisicao (aceito do gateway ou gerado), campos padrao, propagacao para chamadas outbound, redaction de dados sensiveis, nivel por ambiente, correlacao com traces, log de erros e testes.

## Pre-requisitos
- Local: `npm ci`, `docker compose up -d` (ou `npm run start:dev` com Postgres)
- Nuvem (opcional): ambiente no ar e `kubectl -n oficina logs deploy/oficina-app`
- `jq`

## Cenarios de Teste

### TS-01: Logs em JSON
- **Tipo:** Ambos
- **Criterio:** Logger estruturado emitindo JSON
- **Passos:**
  1. `curl -s localhost:3000/health >/dev/null`; ler a linha de log
  2. No EKS: `kubectl -n oficina logs deploy/oficina-app --tail=5 | jq .`
- **Resultado esperado:** cada linha e um JSON valido (`jq` nao falha), com `level`, `time`, `msg`

### TS-02: Correlation ID aceito do gateway ou gerado
- **Tipo:** Ambos
- **Criterio:** Aceita `X-Request-Id`/`traceparent` ou gera; propagado em todos os logs da requisicao
- **Passos:**
  1. `curl -s -i localhost:3000/health -H 'X-Request-Id: qa-123' | grep -i x-correlation`
  2. Sem header: `curl -s -i localhost:3000/health | grep -i x-correlation` -> UUID gerado
  3. Nos logs: `grep qa-123` — todas as linhas daquela requisicao trazem `correlationId: "qa-123"`
- **Resultado esperado:** header de resposta `x-correlation-id` ecoa o recebido ou um UUID; presente em todas as linhas da requisicao

### TS-03: Campos padrao
- **Tipo:** Ambos
- **Criterio:** `timestamp, level, message, correlationId/traceId, method, path, statusCode, latencyMs, userId/role`
- **Passos:**
  1. Requisicao autenticada: `curl -s localhost:3000/clientes -H "Authorization: Bearer $TOKEN"`; ler o log de conclusao
- **Resultado esperado:** linha com `method: "GET"`, `path: "/clientes"`, `statusCode: 200`, `latencyMs`, `correlationId`, `traceId`, `userId`/`role` do token (evidencia no EKS: `{"correlationId":"...","traceId":"...","latencyMs":1,...}`)

### TS-04: Propagacao para chamadas outbound
- **Tipo:** Ambos
- **Criterio:** id propagado em webhooks/Lambda via header
- **Passos:**
  1. Configurar `NOTIFICATION_PROVIDER=webhook` e `NOTIFICATION_WEBHOOK_URL` para um receptor local (`npx http-echo-server` ou webhook.site)
  2. Disparar uma notificacao (completar diagnostico de uma OS)
- **Resultado esperado:** requisicao outbound com header `x-correlation-id` igual ao da requisicao original

### TS-05: Sem dados sensiveis (redaction)
- **Tipo:** Ambos
- **Criterio:** CPF mascarado; token/senha nunca logados
- **Passos:**
  1. `POST /clientes` com CPF; `GET` autenticado com Bearer
  2. `grep -E "eyJ|39053344705" <logs>`
- **Resultado esperado:** nenhum token completo e nenhum CPF em claro; `authorization` redigido (`[Redacted]`), CPF como `390.***.***-05`
- **Automatizado:** testes do logger (`src/logging/*.spec.ts`)

### TS-06: Nivel de log por ambiente
- **Tipo:** Ambos
- **Criterio:** `info` em prod, `debug` em dev via env
- **Passos:**
  1. `LOG_LEVEL=debug npm run start:dev` -> linhas `level: 20`; sem a var em `NODE_ENV=production` -> so `>= 30`
- **Resultado esperado:** conforme; no EKS o ConfigMap define `LOG_LEVEL`/`NODE_ENV=production`

### TS-07: Correlacao com traces (trace_id nos logs)
- **Tipo:** Ambos
- **Criterio:** Integracao com o backend de logs com trace correlation
- **Passos:**
  1. Com `DD_TRACE_ENABLED=true` (EKS) e o agente instalado (`scripts/aws-observability.sh datadog`): abrir um trace no APM e clicar em "Logs"
  2. Sem Datadog: conferir `traceId` no JSON e o mesmo valor no header `x-correlation-id`
- **Resultado esperado:** logs da requisicao aparecem ligados ao trace (`dd.trace_id` injetado pelo `logInjection`)

### TS-08: Erros nao tratados e `DomainError` com contexto
- **Tipo:** Ambos
- **Criterio:** Erros logados com contexto suficiente para o alerta de falha de OS
- **Passos:**
  1. Forcar um erro de dominio: `POST /ordens-servico/<id>/aprovar-orcamento` numa OS em `RECEBIDA`
  2. Forcar 500 (ex.: derrubar o banco e chamar `/clientes`)
- **Resultado esperado:** `level: 40/50`, `err.type`, `err.message`, `path`, `correlationId`, id da OS quando houver; `statusCode` 409/500 — base do monitor "Falha no processamento de OS"

### TS-09: Testes automatizados
- **Tipo:** Automatizado
- **Criterio:** Testes garantindo JSON e correlationId
- **Passos:**
  1. `npx jest src/logging src/common -t "correlation|json|redact"`
- **Resultado esperado:** verdes

### TS-10: README
- **Tipo:** Manual
- **Criterio:** Formato do log e como consultar por correlationId documentados
- **Resultado esperado:** secao no README com o formato e exemplos (`kubectl logs ... | jq 'select(.correlationId=="...")'`, busca no Datadog)

## Casos de Borda
- `X-Request-Id` gigante ou com caracteres invalidos -> sanitizado/truncado ou substituido por UUID
- Requisicoes de probe (`/health`) nao poluem em `info` (nivel reduzido ou filtro) — conferir volume no EKS
- Log de requisicao 503 do readiness com `err` (comportamento observado com o RDS parado) — esperado e util para diagnostico

## Rastreabilidade

| Criterio de Aceite | Cenarios |
|---|---|
| Logger JSON | TS-01 |
| Correlation ID aceito/gerado e propagado | TS-02 |
| Campos padrao | TS-03 |
| Propagacao outbound | TS-04 |
| Sem dados sensiveis | TS-05 |
| Nivel por ambiente | TS-06 |
| Trace correlation | TS-07 |
| Erros com contexto | TS-08 |
| Testes | TS-09 |
| README | TS-10 |

## Checklist de Validacao
- [x] Todos os criterios cobertos
- [x] Casos de borda documentados
- [x] Fluxos de erro documentados
- [x] Instrucoes de setup claras

## Comandos Uteis
```bash
kubectl -n oficina logs deploy/oficina-app --tail=200 | jq -c 'select(.statusCode>=500) | {time,correlationId,path,err:.err.message}'
```
