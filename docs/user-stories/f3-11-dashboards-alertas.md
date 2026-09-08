# US-F3-11: Dashboards e Alertas

**User Story:** Como Gestor, quero dashboards com os indicadores operacionais e alertas para falhas criticas, para monitorar o negocio e reagir a incidentes antes que afetem os clientes.

**Prioridade:** Alta
**Story Points:** 5
**Status:** Em revisão
**DDD Domain:** Observabilidade
**DDD Layer:** Infrastructure
**Repositorio:** 4 (definicoes) — versionadas como codigo quando possivel

## Contexto

Depende dos sinais coletados em [f3-10](f3-10-observabilidade-apm.md) e dos logs
de [f3-09](f3-09-logs-estruturados-correlacao.md). Os dashboards exigidos pelo
enunciado sao tres; os alertas cobrem borda, infra e negocio.

## Criterios de Aceite

Dashboards (exigidos pelo enunciado):

- [x] **Volume diario de ordens de servico** (contagem por dia, opcionalmente por status)
- [x] **Tempo medio de execucao por status** (Diagnostico, Execucao, Finalizacao)
- [x] **Erros e falhas nas integracoes** (webhook de notificacao, Lambda de auth, chamadas externas)
- [x] Painel adicional de saude tecnica: latencia (p95/p99), CPU/memoria, taxa de 5xx, uptime

Alertas:

- [x] **Falha no processamento de ordens de servico** (ex.: erro ao transicionar status, excecao nao tratada em fluxo de OS) — exigido pelo enunciado
- [x] Latencia de API acima do SLO (p95/p99)
- [x] Consumo de CPU/memoria do cluster acima do limite / pods em CrashLoop
- [x] Healthcheck/uptime falhando
- [x] Falha de entrega de notificacao (webhook 4xx/5xx / timeout)
- [x] Canal de notificacao dos alertas definido (e-mail/Slack/etc.) e testado
- [x] Definicoes versionadas como codigo (dashboard/monitor as code) quando o fornecedor permitir
- [ ] Dashboards prontos para **analise ao vivo** na demo — PENDENTE: exige conta Datadog + sistema no ar (card INFRA da sessao do Learner Lab). Definicoes prontas em `observability/` do repo infra-k8s.
- [x] Documentado no README: link dos dashboards, o que cada alerta significa e runbook basico
