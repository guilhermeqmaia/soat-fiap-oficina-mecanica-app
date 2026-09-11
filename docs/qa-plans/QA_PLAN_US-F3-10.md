# QA Plan — US-F3-10: Observabilidade — APM, Metricas de Infra e Uptime

## Summary
Valida a instrumentacao de APM/tracing (`dd-trace`, via `src/observabilidade/tracing.ts`), o endpoint de metricas (`/metrics`, `metrics.registry.ts`), as metricas de negocio (`OsMetricsListener`), as metricas de infra do EKS, os healthchecks/monitores sinteticos e a integracao de tudo com a plataforma escolhida (Datadog, primaria; Prometheus/Grafana/OTel, alternativa OSS).

## Prerequisites
- App rodando com `DD_TRACE_ENABLED=true` (ou stack OSS equivalente) e variaveis `DD_SERVICE`/`DD_ENV`/`DD_VERSION` configuradas
- Cluster EKS com o agente/coletor de observabilidade provisionado ([QA_PLAN_US-F3-05](QA_PLAN_US-F3-05.md), `infra-k8s/observability/`)
- Acesso ao painel da plataforma (Datadog) ou ao Grafana/Prometheus local

## Test Scenarios

### TS-01: Endpoint /metrics exposto e publico apenas dentro do cluster
- **Type:** Automated (unit/integration) / Manual
- **Steps:**
  1. `curl {app_url}/metrics` (dentro do cluster/local) — deve retornar formato OpenMetrics/Prometheus
  2. Confirmar que `/metrics` **nao** esta na lista de rotas publicas do API Gateway ([QA_PLAN_US-F3-02](QA_PLAN_US-F3-02.md)) — chamar via o gateway publico e confirmar que cai no catch-all protegido
- **Expected result:** `/metrics` acessivel via scrape interno (DaemonSet/ServiceMonitor), inacessivel pela internet

### TS-02: APM/tracing captura latencia por rota (p50/p95/p99)
- **Type:** Manual
- **Steps:**
  1. Com tracing habilitado, gerar trafego variado (`npm run perf:smoke` ou requisicoes manuais)
  2. No painel de APM, verificar p50/p95/p99 por rota
- **Expected result:** Latencias visiveis e segmentadas por rota

### TS-03: Traces correlacionados com logs via trace_id
- **Type:** Manual — ver tambem [QA_PLAN_US-F3-09](QA_PLAN_US-F3-09.md) TS-05/TS-08
- **Mecanismo:** com `DD_TRACE_ENABLED=true`, o `mixin` do pino (`logger.module.ts`) le o span ativo via `tracer-bridge` e emite `dd.trace_id`/`dd.span_id` (formato que o pipeline do Datadog casa com o trace) + `traceId` com o mesmo valor. O `correlation-id.middleware` grava a tag `correlation_id` no span (pivo trace -> logs). Sem APM, `dd.trace_id` de `logInjection` fica desligado para nao duplicar campos.
- **Steps:**
  1. Com tracing habilitado, gerar uma requisicao e anotar o `X-Correlation-Id` da resposta
  2. Localizar o trace dessa requisicao no APM; confirmar a tag `correlation_id` com aquele valor
  3. A partir do trace, abrir os logs vinculados e conferir `dd.trace_id` igual ao `trace_id` do trace
  4. Filtro reverso no backend de logs por `@correlation_id:<valor>` retorna todas as linhas da requisicao
- **Expected result:** Navegacao trace <-> logs funcional nos dois sentidos; `dd.trace_id` do log == `trace_id` do trace

### TS-04: Metricas de infra do Kubernetes (CPU/memoria por pod/node)
- **Type:** Manual
- **Steps:**
  1. Verificar `datadog-values.yaml`/`prometheus-values.yaml` (`infra-k8s/observability/`) — DaemonSet/agente coletando `kube-state-metrics`
  2. No painel, verificar series `kubernetes.cpu.usage.total` e `kubernetes.memory.usage` por pod
- **Expected result:** Metricas de CPU/memoria disponiveis por pod e por node

### TS-05: Healthchecks / monitor sintetico de uptime
- **Type:** Manual — ver `synthetics.tf`
- **Acceptance criterion:** Monitor sintetico batendo em /health e /health/ready + endpoint publico via gateway
- **Steps:**
  1. Verificar `datadog_synthetics_test` (ou equivalente OSS) configurado para `/health`, `/health/ready` e a URL publica do gateway
  2. Derrubar propositalmente a app (ambiente de teste) e observar o monitor sintetico detectar a falha
- **Expected result:** Monitor detecta indisponibilidade em minutos, alimentando o alerta de uptime (US-F3-11)

### TS-06: Metricas do API Gateway coletadas
- **Type:** Manual
- **Acceptance criterion:** Latencia de borda, 4xx/5xx, throttling
- **Steps:**
  1. Verificar integracao de metricas `aws.apigateway.*` no painel tecnico
- **Expected result:** `aws.apigateway.latency` e `aws.apigateway.5xxerror` visiveis (usados no dashboard tecnico, ver US-F3-11)

### TS-07: Metricas customizadas de negocio expostas
- **Type:** Automated (unit — `observabilidade.spec.ts`) / Manual
- **Acceptance criterion:** Volume de OS, tempo por status, erros de integracao
- **Steps:**
  1. Disparar uma transicao de status de OS e verificar o incremento do contador `oficina_os_transicoes_total` (via `OsMetricsListener`) em `/metrics`
  2. Chamar `OsMetricsListener.registrarIntegracao('webhook-notificacao', 'falha')` (ou disparar uma falha real de webhook) e verificar `oficina_integracoes_total`
- **Expected result:** Contadores incrementam corretamente e aparecem no scrape

### TS-08: Agente/coletor provisionado via Terraform com credenciais seguras
- **Type:** Manual/config
- **Steps:**
  1. Revisar `infra-k8s/observability/*.tf` — instalacao do agente/Helm release e a origem das credenciais (Secret/IRSA, nao hardcoded)
- **Expected result:** Credenciais do agente via Secret/IRSA, nunca em texto plano no `.tf`

### TS-09: Retencao e custo documentados
- **Type:** Manual
- **Steps:**
  1. Conferir `observability/README.md` quanto a retencao/custo do plano (trial)
- **Expected result:** Documentado, com ressalva de que o trial cobre a janela da demo

### TS-10: Dados aparecem no painel em tempo real (pendencia conhecida)
- **Type:** Manual
- **Steps:**
  1. Com conta Datadog ativa e cluster no ar, gerar trafego e observar o painel atualizando em tempo real
- **Expected result:** Dados visiveis ao vivo — **status no momento deste plano: PENDENTE**, depende de sessao ativa do AWS Academy Learner Lab + conta Datadog; localmente validado apenas que `/metrics` responde com os sinais esperados

### TS-11: README documenta acesso ao painel e sinais disponiveis
- **Type:** Manual
- **Acceptance criterion:** Documentado no README: como acessar o painel, quais sinais existem, como reproduzir
- **Steps:**
  1. Abrir `observability/README.md` (ou README correspondente)
  2. Confirmar que documenta como acessar o painel, quais sinais/metricas existem e como reproduzir a configuracao
- **Expected result:** README completo, cobrindo acesso ao painel, sinais existentes e reproducao

## Edge Cases
- Tracing habilitado mas sem `DD_API_KEY`/credenciais validas — app deve continuar funcionando normalmente (observabilidade nunca pode derrubar o fluxo de negocio)
- Pico de cardinalidade em labels (ex.: um label com muitos valores unicos) — verificar que os labels usados (`route`, `status`, `de`/`para`) sao de baixa cardinalidade
- Agente do cluster reiniciando (`CrashLoopBackOff`) — gap de metricas deve ser visivel no proprio painel (nao silencioso)

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| APM/tracing com latencia por rota | TS-02 |
| Traces correlacionados com logs | TS-03 |
| Metricas de infra do K8s | TS-04 |
| Healthchecks / uptime sintetico | TS-05 |
| Metricas do API Gateway | TS-06 |
| Metricas de negocio (volume OS, tempo por status, erros) | TS-07 |
| Agente provisionado via Terraform com credenciais seguras | TS-08 |
| Retencao e custo documentados | TS-09 |
| Dados em tempo real na demo | TS-10 (pendente) |
| Documentado no README: acesso ao painel, sinais, reproducao | TS-11 |

## Validation Checklist
- [ ] Todos os criterios de aceite cobertos
- [ ] Edge cases documentados
- [ ] Pendencia de validacao ao vivo (TS-10) registrada, nao escondida
- [ ] Instrucoes de setup claras

## Useful Commands
```bash
curl {app_url}/metrics
npm test -- observabilidade
npm run perf:smoke
```
