# QA Plan — US-F3-10: Observabilidade — APM, Metricas de Infra e Uptime

## Resumo
Valida os sinais exigidos independentemente do fornecedor: APM/tracing com latencia por rota, traces correlacionados aos logs, metricas de CPU/memoria do Kubernetes, monitores sinteticos de uptime, metricas do API Gateway, metricas de negocio no `/metrics`, coletor provisionado no EKS (`scripts/aws-observability.sh` com os values de `observability/`), retencao/custo e validacao em tempo real.

## Pre-requisitos
- Ambiente no ar; `kubectl` no cluster; `helm` local
- Datadog: `DD_API_KEY` (trial) — `DD_API_KEY=... scripts/aws-observability.sh datadog`; alternativa sem chave: `scripts/aws-observability.sh prometheus`
- Trafego: `k6 run perf/smoke.js -e BASE_URL=$GW -e JWT_SECRET=<segredo>` ou os fluxos dos outros QA Plans

## Cenarios de Teste

### TS-01: APM/tracing com latencia por rota (p50/p95/p99)
- **Tipo:** Manual
- **Criterio:** APM instrumentado com latencia das APIs por rota
- **Passos:**
  1. `kubectl -n oficina get cm oficina-app-config -o jsonpath='{.data.DD_TRACE_ENABLED}'` -> `true`
  2. Gerar trafego (smoke k6); no Datadog APM > Services > `oficina-mecanica-app` > Resources
  3. Sem Datadog: `kubectl -n oficina exec deploy/oficina-app -c app -- wget -qO- localhost:3000/metrics | grep oficina_http_request_duration_seconds`
- **Resultado esperado:** rotas com p50/p95/p99; histograma `oficina_http_request_duration_seconds{route,method,status}` no `/metrics`

### TS-02: Traces correlacionados aos logs
- **Tipo:** Manual
- **Criterio:** `trace_id` nos logs
- **Passos:**
  1. `kubectl -n oficina logs deploy/oficina-app --tail=20 | jq '{traceId, correlationId, "dd.trace_id"}'`
  2. No Datadog, abrir um trace e a aba Logs
- **Resultado esperado:** ids presentes em todo log de requisicao; logs aparecem dentro do trace (QA_PLAN_US-F3-09 TS-07)

### TS-03: Metricas de infra do Kubernetes
- **Tipo:** Manual
- **Criterio:** CPU e memoria por pod/node
- **Passos:**
  1. Datadog: Infrastructure > Kubernetes > cluster `oficina-mecanica-eks` (kube-state-metrics + agente); ou Grafana (kube-prometheus-stack) dashboards "Kubernetes / Compute Resources"
  2. `kubectl top pods -n oficina`
- **Resultado esperado:** CPU/memoria por pod e node visiveis no painel e coerentes com `kubectl top`

### TS-04: Healthchecks / uptime sinteticos
- **Tipo:** Manual
- **Criterio:** Monitor sintetico em `/health`, `/health/ready` e endpoint publico via gateway
- **Passos:**
  1. `synthetics.tf` no repo infra-k8s (`observability/`): `terraform plan` com a URL do gateway
  2. No Datadog: Synthetics > testes `oficina-*` verdes; pausar o ambiente (`aws-pause.sh`) e observar o teste falhar
- **Resultado esperado:** monitores criados como codigo; uptime cai quando o backend some

### TS-05: Metricas do API Gateway
- **Tipo:** Manual
- **Criterio:** Latencia de borda, 4xx/5xx, throttling
- **Passos:**
  1. `aws cloudwatch get-metric-statistics --namespace AWS/ApiGateway --metric-name Count --dimensions Name=ApiId,Value=<id> --start-time <-1h> --end-time <now> --period 300 --statistics Sum`
  2. Access logs JSON em `/aws/apigateway/oficina-mecanica-gateway` (`status`, `latencyMs`, `authorizerError`) — forwarder para o painel de borda
- **Resultado esperado:** metricas `Count`, `4xx`, `5xx`, `Latency` no CloudWatch; access logs com os campos do painel

### TS-06: Metricas de negocio no `/metrics`
- **Tipo:** Ambos
- **Criterio:** Volume de OS, tempo por status, erros de integracao
- **Passos:**
  1. Abrir e movimentar uma OS (QA_PLAN_US-F3-06)
  2. `wget -qO- localhost:3000/metrics | grep -E "oficina_os_transicoes_total|oficina_os_tempo_no_status_seconds|oficina_integracoes_total"`
- **Resultado esperado:** contadores/histogramas com labels (`status`, `integracao`, `resultado`) atualizados apos as acoes
- **Automatizado:** testes de `src/metrics` (`npx jest src/metrics`)

### TS-07: Coletor provisionado no EKS com credencial via Secret
- **Tipo:** Ambos
- **Criterio:** Agente/coletor no EKS via manifesto/Helm, credenciais via Secret/IRSA
- **Passos:**
  1. `DD_API_KEY=... scripts/aws-observability.sh datadog` (ou `prometheus`)
  2. `kubectl -n datadog get pods` / `kubectl -n observability get pods`; `kubectl -n datadog get secret datadog-secret`
- **Resultado esperado:** DaemonSet do agente + cluster-agent `Running`; API key so no Secret (sem IRSA — desvio documentado em `observability/README.md`); `aws-deploy-all.sh` instala automaticamente quando `DD_API_KEY` esta no ambiente

### TS-08: Retencao e custo documentados
- **Tipo:** Manual
- **Criterio:** Retencao e custo do plano
- **Resultado esperado:** `observability/README.md` secao "Custo e retencao" (trial 14 dias; Prometheus 7d, sem custo)

### TS-09: Dados em tempo real no painel
- **Tipo:** Manual
- **Criterio:** Validado que os dados aparecem em tempo real
- **Passos:**
  1. Com o coletor instalado, gerar trafego com k6 por 2 min e acompanhar o dashboard tecnico (latencia, 5xx, CPU) atualizando
- **Resultado esperado:** atraso < 1 min entre a requisicao e o painel. **Status:** depende de conta Datadog (`DD_API_KEY`); sem ela, validar com Grafana (`scripts/aws-observability.sh prometheus`, port-forward impresso pelo script)

### TS-10: README
- **Tipo:** Manual
- **Criterio:** Como acessar o painel, sinais e como reproduzir
- **Resultado esperado:** `observability/README.md` (tabela de sinais e origem, instalacao, alternativa OSS) + README do app (instrumentacao)

## Casos de Borda
- `DD_TRACE_ENABLED=true` sem agente no cluster: a app continua funcionando (tracer descarta), sem erro
- Pause/resume: metricas de infra somem enquanto os nos estao em 0 — esperado
- Trial do Datadog expirado antes do video: trocar para `prometheus` (mesmos sinais, `/metrics` OpenMetrics)

## Rastreabilidade

| Criterio de Aceite | Cenarios |
|---|---|
| APM/tracing por rota | TS-01 |
| Traces x logs | TS-02 |
| Metricas de infra k8s | TS-03 |
| Healthchecks/uptime | TS-04 |
| Metricas do API Gateway | TS-05 |
| Metricas de negocio | TS-06 |
| Coletor no EKS via Terraform/Helm com Secret | TS-07 |
| Retencao e custo | TS-08 |
| Tempo real no painel | TS-09 |
| README | TS-10 |

## Checklist de Validacao
- [x] Todos os criterios cobertos
- [x] Casos de borda documentados
- [x] Fluxos de erro documentados
- [x] Instrucoes de setup claras

## Comandos Uteis
```bash
scripts/aws-observability.sh prometheus     # repo infra-k8s, cluster no ar
kubectl -n observability port-forward svc/obs-grafana 3001:80
```
