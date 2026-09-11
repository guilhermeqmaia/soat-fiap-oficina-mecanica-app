# QA Plan — US-F3-11: Dashboards e Alertas

## Summary
Valida os dashboards versionados como codigo (`soat-fiap-oficina-infra-k8s/observability/dashboards.tf`) — negocio (volume de OS, tempo por status, erros de integracao) e tecnico (latencia, 5xx, CPU/memoria, uptime) — e os monitores (`monitors.tf`): falha de processamento de OS, latencia acima do SLO, CPU/CrashLoop, healthcheck e falha de notificacao, incluindo o canal de notificacao e o runbook de cada um.

## Prerequisites
- Terraform aplicado em `soat-fiap-oficina-infra-k8s/observability/` com as chaves do Datadog configuradas (`local.habilitado = true`)
- Trafego real ou simulado na aplicacao para gerar dados nos paineis
- Acesso ao canal de notificacao configurado (e-mail/Slack) para validar o disparo

## Test Scenarios

### TS-01: Dashboard de negocio — volume diario de OS
- **Type:** Manual
- **Acceptance criterion:** Volume diario de ordens de servico (por status)
- **Steps:**
  1. Abrir o dashboard "Oficina — Operacao (negocio)"
  2. Gerar algumas transicoes de OS e verificar o painel "Volume diario de OS (por status de destino)" atualizar
- **Expected result:** Contagem correta, quebrada por status de destino

### TS-02: Dashboard de negocio — tempo medio por status
- **Type:** Manual
- **Acceptance criterion:** Tempo medio de execucao por status (Diagnostico, Execucao, Finalizacao)
- **Steps:**
  1. Levar uma OS de ponta a ponta pelos status (Diagnostico -> Execucao -> Finalizacao) com tempos conhecidos
  2. Verificar o painel "Tempo medio por status (p50 e p95)"
- **Expected result:** Valores de p50/p95 condizentes com o tempo real gasto em cada status

### TS-03: Dashboard de negocio — erros e falhas de integracao
- **Type:** Manual
- **Acceptance criterion:** Erros e falhas nas integracoes (webhook, Lambda de auth, chamadas externas)
- **Steps:**
  1. Forcar uma falha no webhook de notificacao (ex.: apontar `NOTIFICATION_WEBHOOK_URL` para um endpoint invalido)
  2. Verificar o painel "Erros de integracao" e a "Taxa de sucesso das integracoes (24h)"
- **Expected result:** Falha refletida no painel; taxa de sucesso cai e o `conditional_format` destaca em vermelho (<95%)

### TS-04: Painel tecnico — latencia, 5xx, CPU/memoria, replicas
- **Type:** Manual
- **Steps:**
  1. Abrir o dashboard "Oficina — Saude tecnica"
  2. Gerar carga (`npm run perf:load`) e observar os paineis de latencia p95/p99 (com marcador do SLO 500ms), taxa de 5xx, CPU/memoria dos pods e replicas do HPA
- **Expected result:** Todos os paineis refletem o comportamento real sob carga

### TS-05: Painel tecnico — API Gateway (latencia e erros de borda)
- **Type:** Manual
- **Steps:**
  1. Verificar o painel "API Gateway — latencia de borda e erros"
- **Expected result:** Series `aws.apigateway.latency` e `aws.apigateway.5xxerror` populadas

### TS-06: Alerta critico — falha no processamento de OS
- **Type:** Manual
- **Acceptance criterion:** Exigido pelo enunciado
- **Steps:**
  1. Forcar mais de 5 erros 5xx em rotas de `/ordens-servico*` numa janela de 15 minutos (ambiente de teste)
  2. Verificar disparo do monitor `falha_processamento_os` e recebimento da notificacao no canal configurado
- **Expected result:** Alerta critico disparado com a mensagem/runbook completos (dashboard, correlationId, checar `/health/ready` e RDS)

### TS-07: Alerta de latencia acima do SLO
- **Type:** Manual
- **Steps:**
  1. Gerar carga suficiente para empurrar o p95 acima de 500ms (`monitor_thresholds.warning = 0.3`, `critical = 0.5`)
  2. Verificar disparo do alerta `latencia_slo`
- **Expected result:** Alerta de warning/critico conforme o threshold ultrapassado

### TS-08: Alertas de CPU/CrashLoop
- **Type:** Manual
- **Steps:**
  1. Simular CPU alta sustentada (>85%) nos pods — verificar `cpu_pods`
  2. Simular um pod em CrashLoopBackOff (ex.: `DATABASE_URL` invalida) — verificar `pods_crashloop`
- **Expected result:** Ambos os alertas disparam com o runbook correspondente (`kubectl describe`/`logs --previous`, rollback)

### TS-09: Alerta de uptime (sintetico)
- **Type:** Manual
- **Steps:**
  1. Derrubar a aplicacao/gateway (ambiente de teste) e aguardar o monitor sintetico falhar 2x
  2. Verificar disparo do alerta `uptime`
- **Expected result:** Alerta critico "API publica fora do ar" disparado, apontando gateway/VPC Link/NLB/app como possiveis causas

### TS-10: Alerta de falha de notificacao ao cliente
- **Type:** Manual
- **Steps:**
  1. Forcar mais de 3 falhas de entrega de notificacao numa janela de 30 minutos
  2. Verificar disparo do alerta `falha_notificacao`
- **Expected result:** Alerta de aviso disparado, deixando claro que o fluxo de OS segue funcionando mas o cliente nao foi avisado

### TS-11: Canal de notificacao configurado e testado
- **Type:** Manual
- **Steps:**
  1. Verificar `local.destino` (referenciado em todas as mensagens de monitor) — canal real (e-mail/Slack)
  2. Disparar um teste manual de notificacao (ex.: `datadog_monitor` de teste) e confirmar recebimento
- **Expected result:** Notificacoes chegam ao canal correto

### TS-12: Definicoes versionadas como codigo
- **Type:** Automated (CI) / Manual
- **Steps:**
  1. `terraform -chdir=observability fmt -check -diff && validate`
  2. Confirmar que qualquer mudanca de dashboard/alerta passa por PR (nao e editada manualmente so na UI do Datadog)
- **Expected result:** `dashboards.tf`/`monitors.tf` sao a fonte da verdade

### TS-13: Dashboards prontos para analise ao vivo (pendencia conhecida)
- **Type:** Manual
- **Steps:**
  1. Com conta Datadog + cluster no ar, abrir os dashboards durante uma demo e confirmar atualizacao em tempo real
- **Expected result:** **PENDENTE no momento deste plano** — depende da sessao do Learner Lab; definicoes ja prontas em `soat-fiap-oficina-infra-k8s/observability/`

### TS-14: README documenta dashboards, alertas e runbook
- **Type:** Manual
- **Acceptance criterion:** Documentado no README: link dos dashboards, o que cada alerta significa e runbook basico
- **Steps:**
  1. Abrir o README (`soat-fiap-oficina-infra-k8s/observability/README.md` ou equivalente)
  2. Confirmar link dos dashboards, descricao de cada alerta e runbook basico
- **Expected result:** README completo, cobrindo link dos dashboards, significado dos alertas e runbook

## Edge Cases
- Multiplos alertas disparando ao mesmo tempo (incidente maior) — verificar se ha alguma forma de agrupamento/silenciamento para evitar spam
- Alerta de negocio (`falha_processamento_os`) disparando por uma causa de infra (ex.: RDS fora do ar) — runbook deve orientar a checagem cruzada
- Falso positivo do monitor sintetico por instabilidade momentanea de rede — threshold de "last(2)" deve evitar alarme por uma unica falha isolada

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| Dashboard: volume diario de OS | TS-01 |
| Dashboard: tempo medio por status | TS-02 |
| Dashboard: erros de integracao | TS-03 |
| Painel de saude tecnica | TS-04, TS-05 |
| Alerta: falha no processamento de OS | TS-06 |
| Alerta: latencia acima do SLO | TS-07 |
| Alerta: CPU/CrashLoop | TS-08 |
| Alerta: healthcheck/uptime | TS-09 |
| Alerta: falha de notificacao | TS-10 |
| Canal de notificacao testado | TS-11 |
| Definicoes versionadas como codigo | TS-12 |
| Analise ao vivo na demo | TS-13 (pendente) |
| Documentado no README: dashboards, alertas, runbook | TS-14 |

## Validation Checklist
- [ ] Todos os criterios de aceite cobertos
- [ ] Edge cases documentados
- [ ] Pendencia de demo ao vivo (TS-13) registrada
- [ ] Instrucoes de setup claras

## Useful Commands
```bash
terraform -chdir=observability fmt -check -diff
terraform -chdir=observability init -backend=false -input=false
terraform -chdir=observability validate
terraform -chdir=observability plan
```
