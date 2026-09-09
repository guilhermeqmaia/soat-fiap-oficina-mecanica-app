# ADR-0004: Plataforma de observabilidade

**Status:** Aceita
**Data:** 2026-08-24

## Contexto

O enunciado exige APM, métricas de infra do K8s (CPU/memória), healthchecks/
uptime, alertas, logs estruturados com correlação e dashboards (volume diário
de OS, tempo médio por status, erros de integração) com análise ao vivo no
vídeo de entrega. Candidatas cobertas nas aulas: Datadog, New Relic,
Prometheus + Grafana (+ OpenTelemetry).

## Decisão

**Datadog** como plataforma primária (US-F3-10/11): APM + infra + logs +
dashboards + alertas em um único painel, agente oficial para EKS, trial
suficiente para o período da demo, e é nomeado no enunciado.
**Prometheus + Grafana** ficam registrados como alternativa OSS caso o trial
expire antes da entrega — os sinais exigidos (latência, CPU/memória, uptime,
erros) independem do fornecedor.

## Consequências

- Um único painel para a demo ao vivo (requisito do vídeo) — sem alternar
  entre ferramentas.
- Agente Datadog instalado no cluster (US-F3-05/10) e SDK/APM no monólito;
  logs JSON com `correlation-id` (US-F3-09) habilitam a correlação
  logs ↔ traces.
- Access logs do API Gateway (CloudWatch) são exportados/encaminhados ao
  Datadog para visão de borda.
- API key do Datadog é segredo: GitHub Actions Secrets (CI) e Secret do K8s
  (runtime) — nunca commitada.
- Dependência de SaaS externo: se a infra cair, a observabilidade sobrevive
  (vantagem); se o trial expirar, plano B documentado (Prometheus/Grafana).
