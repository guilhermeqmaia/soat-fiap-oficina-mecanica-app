# US-F3-10: Observabilidade — APM, Metricas de Infra e Uptime

**User Story:** Como time de operacao, quero instrumentar a aplicacao e o cluster com APM, metricas de recursos e healthchecks, para ter visibilidade total de latencia, consumo e disponibilidade em tempo real.

**Prioridade:** Alta
**Story Points:** 5
**Status:** Em revisão
**DDD Domain:** Observabilidade
**DDD Layer:** Infrastructure
**Repositorio:** 4 (instrumentacao) + 2 (agentes/coletores no cluster)

## Contexto

Plataforma primaria: **Datadog** (registrada em ADR — [f3-doc-02](f3-doc-02-adrs.md));
alternativa OSS: **Prometheus + Grafana + OpenTelemetry**. Os criterios abaixo
descrevem os **sinais** exigidos e independem do fornecedor escolhido.

## Criterios de Aceite

- [x] **APM / tracing** instrumentado (OpenTelemetry ou agente do fornecedor) com **latencia das APIs** (p50/p95/p99) por rota
- [x] Traces correlacionados com os **logs** ([f3-09](f3-09-logs-estruturados-correlacao.md)) via `trace_id`
- [x] **Metricas de infra do Kubernetes**: CPU e memoria por pod/node (agente/DaemonSet ou kube-state-metrics)
- [x] **Healthchecks / uptime**: monitor sintetico batendo em `/health` e `/health/ready` + monitor do endpoint publico via gateway
- [x] Metricas do **API Gateway** (latencia de borda, 4xx/5xx, throttling) coletadas ([f3-02](f3-02-api-gateway.md))
- [x] Metricas customizadas de negocio expostas para os dashboards: volume de OS, tempo por status, erros de integracao (notificacao/webhook)
- [x] Agente/coletor provisionado no EKS via Terraform/manifesto ([f3-05](f3-05-terraform-cluster-kubernetes.md)), com credenciais via Secret/IRSA
- [x] Retencao e custo do plano documentados (trial cobre a janela da demo)
- [ ] Validado que os dados aparecem no painel **em tempo real** — PENDENTE: exige conta Datadog + cluster no ar (card INFRA da sessao do Learner Lab). Localmente validado que `/metrics` responde com os sinais.
- [x] Documentado no README: como acessar o painel, quais sinais existem, como reproduzir

## Fora de escopo

- Construcao dos dashboards e alertas — ver [f3-11](f3-11-dashboards-alertas.md)
