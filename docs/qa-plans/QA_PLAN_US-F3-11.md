# QA Plan — US-F3-11: Dashboards e Alertas

## Resumo
Valida os tres dashboards exigidos (volume diario de OS, tempo medio por status, erros de integracao) mais o painel tecnico, e os alertas (falha no processamento de OS, latencia, CPU/memoria/CrashLoop, uptime, notificacao), o canal de notificacao, as definicoes como codigo (`observability/dashboards.tf`, `monitors.tf`) e a prontidao para analise ao vivo.

## Pre-requisitos
- Conta Datadog (trial) com API/APP keys para o provider Terraform; ambiente no ar com o agente instalado (QA_PLAN_US-F3-10 TS-07)
- Seeds `04_metricas_tempo.sql` e `05_notificacoes.sql` para dados historicos (`npx prisma db execute --file ...` no pod)
- `k6` para gerar carga; `NOTIFICATION_PROVIDER=webhook` apontando para uma URL que falha (simular erro de integracao)

## Cenarios de Teste

### TS-01: Dashboard — volume diario de OS
- **Tipo:** Manual
- **Criterio:** Contagem por dia (opcionalmente por status)
- **Passos:**
  1. Carregar seeds 04/05; abrir algumas OS pelo gateway
  2. Abrir o painel "Oficina — Operacao (negocio)" (output `dashboard_negocio_url`)
- **Resultado esperado:** serie diaria com as OS de hoje somadas as do seed; quebra por status

### TS-02: Dashboard — tempo medio por status
- **Tipo:** Manual
- **Criterio:** Diagnostico, Execucao, Finalizacao
- **Passos:**
  1. Movimentar uma OS: atribuir mecanico -> completar diagnostico -> aprovar -> finalizar
  2. Conferir `oficina_os_tempo_no_status_seconds` e o widget do painel (p50/p95)
- **Resultado esperado:** tempos por status coerentes com as transicoes feitas; `GET /ordens-servico/metricas/tempo-medio` devolve os mesmos numeros

### TS-03: Dashboard — erros e falhas nas integracoes
- **Tipo:** Manual
- **Criterio:** Webhook de notificacao, Lambda, chamadas externas
- **Passos:**
  1. Apontar `NOTIFICATION_WEBHOOK_URL` para um endpoint que responde 500 e completar um diagnostico (dispara notificacao)
  2. Painel: widget de erros de integracao / taxa de sucesso
- **Resultado esperado:** `oficina_integracoes_total{integracao="notificacao",resultado="erro"}` incrementa e aparece no painel

### TS-04: Painel tecnico
- **Tipo:** Manual
- **Criterio:** Latencia p95/p99, CPU/memoria, 5xx, uptime
- **Passos:**
  1. `k6 run perf/load.js -e BASE_URL=$GW ...` por 3 min; abrir "Oficina — Saude tecnica"
- **Resultado esperado:** latencia com marcador de SLO, CPU/memoria dos pods, replicas (HPA) e latencia/erros do gateway atualizando

### TS-05: Alerta — falha no processamento de OS
- **Tipo:** Manual
- **Criterio:** Exigido pelo enunciado
- **Passos:**
  1. Provocar > 5 respostas 5xx em `/ordens-servico` em 15 min (ex.: parar o RDS com `aws rds stop-db-instance` e chamar `GET /ordens-servico` 6x autenticado)
  2. Monitors > "Falha no processamento de OS"
- **Resultado esperado:** monitor `ALERT` com a mensagem explicando o significado e o runbook; e-mail no canal `alert_email`

### TS-06: Alerta — latencia acima do SLO
- **Tipo:** Manual
- **Criterio:** p95 > 500 ms por 10 min
- **Passos:**
  1. `k6 run perf/stress.js -e BASE_URL=$GW ...` (ou reduzir `limits.cpu` temporariamente)
- **Resultado esperado:** monitor de latencia dispara; volta a OK apos a carga

### TS-07: Alerta — CPU/memoria e CrashLoop
- **Tipo:** Manual
- **Criterio:** CPU > 85% / pods em CrashLoopBackOff
- **Passos:**
  1. CPU: carga sustentada (TS-04); CrashLoop: `kubectl -n oficina set env deploy/oficina-app DATABASE_URL=postgresql://x` (reverter depois com `kubectl rollout undo`)
- **Resultado esperado:** monitores respectivos em `ALERT`

### TS-08: Alerta — uptime
- **Tipo:** Manual
- **Criterio:** Healthcheck falhando
- **Passos:**
  1. `scripts/aws-pause.sh` (ou escalar a app para 0)
- **Resultado esperado:** monitor sintetico "API publica fora do ar" dispara em < 5 min; `aws-resume.sh` recupera

### TS-09: Alerta — falha de entrega de notificacao
- **Tipo:** Manual
- **Criterio:** Webhook 4xx/5xx / timeout
- **Passos:** repetir TS-03 ate > 3 falhas em 30 min
- **Resultado esperado:** monitor "Falhas na entrega de notificacoes" em `WARN`

### TS-10: Canal de notificacao definido e testado
- **Tipo:** Manual
- **Criterio:** E-mail/Slack testado
- **Passos:**
  1. `terraform output` do stage `observability/` -> `alert_email`; no monitor, "Test Notifications"
- **Resultado esperado:** e-mail recebido com o corpo do alerta

### TS-11: Definicoes versionadas como codigo
- **Tipo:** Automatizado
- **Criterio:** Dashboard/monitor as code
- **Passos:**
  1. `terraform -chdir=observability validate`; CI do infra-k8s (`fmt + validate (observability)`)
  2. `terraform plan` com as chaves do Datadog
- **Resultado esperado:** `dashboards.tf`, `monitors.tf`, `synthetics.tf` validos; plan lista 2 dashboards + 6 monitores + sinteticos

### TS-12: Prontos para analise ao vivo
- **Tipo:** Manual
- **Criterio:** Dashboards prontos para a demo
- **Passos:**
  1. Ensaiar o roteiro do video: `aws-resume.sh` -> k6 smoke -> abrir os dois dashboards -> mostrar um alerta
- **Resultado esperado:** dados em tempo real (< 1 min). **Status:** pendente de conta Datadog (`DD_API_KEY` + APP key); alternativa Grafana valida os sinais, nao os monitores do Datadog

### TS-13: README
- **Tipo:** Manual
- **Criterio:** Link dos dashboards, significado de cada alerta, runbook
- **Resultado esperado:** `observability/README.md` secao "Dashboards e alertas" com as tabelas e runbooks

## Casos de Borda
- Ambiente pausado por horas: monitores sinteticos ficam em alerta — silenciar (downtime) durante a pausa
- Trial expirado: monitores param de avaliar; documentar a data de expiracao no README

## Rastreabilidade

| Criterio de Aceite | Cenarios |
|---|---|
| Volume diario de OS | TS-01 |
| Tempo medio por status | TS-02 |
| Erros nas integracoes | TS-03 |
| Painel tecnico | TS-04 |
| Alerta falha de OS | TS-05 |
| Alerta latencia | TS-06 |
| Alerta CPU/memoria/CrashLoop | TS-07 |
| Alerta uptime | TS-08 |
| Alerta notificacao | TS-09 |
| Canal testado | TS-10 |
| Definicoes como codigo | TS-11 |
| Analise ao vivo | TS-12 |
| README | TS-13 |

## Checklist de Validacao
- [x] Todos os criterios cobertos
- [x] Casos de borda documentados
- [x] Fluxos de erro documentados
- [x] Instrucoes de setup claras

## Comandos Uteis
```bash
terraform -chdir=observability init -backend=false && terraform -chdir=observability validate   # repo infra-k8s
```
