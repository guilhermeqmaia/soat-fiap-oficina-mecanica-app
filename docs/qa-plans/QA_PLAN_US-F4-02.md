# QA Plan — US-F4-02: Mensageria — SNS + SQS FIFO com DLQ (Terraform)

## Resumo
Valida o stage `messaging/` do repo `soat-fiap-oficina-infra-k8s`: 3 topicos SNS FIFO (um por produtor), 4 filas SQS FIFO (uma por consumidor) com DLQ, assinaturas filtradas por `type`, policy IAM dos nodes, alarmes de DLQ e contrato em SSM — a mesma topologia do LocalStack do kit (RFC-0006).

## Pre-requisitos
- Repo `soat-fiap-oficina-infra-k8s` clonado; Terraform >= 1.9; profile AWS `oficina` (conta propria) ou credenciais do Academy
- Para o apply real: bucket de state (`TF_STATE_BUCKET`) e, opcionalmente, `node_role_name` (role dos nodes do stage cluster)
- Para TS-06/07: cluster no ar com os servicos (ciclo de deploy)

## Cenarios de Teste

### TS-01: fmt + validate + plan
- **Tipo:** Automatizado
- **Criterio:** Stage `messaging/` com topicos/filas/DLQ/assinaturas
- **Passos:** `cd messaging && terraform fmt -check && terraform init -backend=false && terraform validate && terraform plan`
- **Resultado esperado:** valido; plan com 41 recursos (3 topicos, 4 filas, 4 DLQs, 4 redrive-allow, 4 queue policies, 6 assinaturas, policy IAM, 4 alarmes, 11 parametros SSM); CI do PR comenta o plan

### TS-02: Topologia igual ao LocalStack do kit
- **Tipo:** Manual
- **Criterio:** Topologia da RFC-0006
- **Passos:** comparar `messaging/locals.tf` (subscriptions) com `scripts/messaging-local.sh` do kit e com `docs/contratos/README.md` (tabela evento -> fila)
- **Resultado esperado:** mesmas filas, mesmos `type`s por assinatura

### TS-03: Assinaturas filtram por `type` e entregam raw
- **Tipo:** Manual (apos apply)
- **Criterio:** Filtro por `type`
- **Passos:**
  1. `aws sns publish --topic-arn <oficina-billing> --message '{"id":"t1","type":"billing.orcamento-gerado",...}' --message-attributes '{"type":{"DataType":"String","StringValue":"billing.orcamento-gerado"}}' --message-group-id OS-1 --message-deduplication-id t1`
  2. `aws sqs receive-message --queue-url <os-eventos>` e `<notificacao-eventos>` e `<billing-comandos>`
- **Resultado esperado:** mensagem (corpo = envelope cru) em `os-eventos` e `notificacao-eventos`; nada em `billing-comandos`

### TS-04: DLQ apos 5 falhas e alarme
- **Tipo:** Manual (apos apply)
- **Criterio:** DLQ por fila + alarme
- **Passos:** receber a mesma mensagem 5 vezes sem apagar (`receive-message` repetido apos o visibility timeout de 30 s); consultar a DLQ; ver o alarme `<fila>-dlq-nao-vazia` no CloudWatch
- **Resultado esperado:** mensagem movida para `<fila>-dlq.fifo`; alarme em ALARM em ate 2 min; e-mail se `alert_email` configurado

### TS-05: Permissao dos nodes
- **Tipo:** Manual (apos apply com `node_role_name`)
- **Criterio:** Politica de acesso
- **Passos:** `aws iam list-attached-role-policies --role-name oficina-mecanica-eks-node-role`
- **Resultado esperado:** `oficina-mecanica-messaging-services` anexada; de um pod no EKS, `aws sns publish` no proprio topico funciona

### TS-06: Contrato em SSM + propagacao para os repos
- **Tipo:** Manual
- **Criterio:** Outputs publicados
- **Passos:** `scripts/messaging-vars.sh`; `gh variable list -R <repo do servico>`
- **Resultado esperado:** `SNS_TOPIC_ARN` e `SQS_QUEUE_URL` definidos em `mecanica-app`, `billing-service` e `execucao-service` (+ `SQS_NOTIFICACAO_QUEUE_URL` no OS)

### TS-07: Reprocessar a DLQ (runbook)
- **Tipo:** Manual
- **Criterio:** Mensagem na DLQ exige triagem (ADR-0009)
- **Passos:** `aws sqs start-message-move-task --source-arn <dlq> --destination-arn <fila>`
- **Resultado esperado:** mensagens voltam a fila principal; consumidor deduplica pelo `id`

## Casos de Borda
- `alert_email` vazio: alarmes existem sem acao (visiveis no console/Datadog)
- `node_role_name` vazio (Academy): policy criada, sem attachment — anexar a mao ou usar LabRole
- Apply sem o cluster: valido — o stage nao depende do EKS

## Rastreabilidade
| Criterio | Cenarios |
|---|---|
| Stage com topicos/filas/DLQ | TS-01, TS-02 |
| Assinaturas com filtro por type | TS-03 |
| DLQ + alarme | TS-04, TS-07 |
| Politica de acesso | TS-05 |
| Outputs/SSM para os deploys | TS-06 |
| Compose/LocalStack | TS-02 (kit: QA_PLAN_US-F4-01 TS-08) |
| Custo documentado | README do stage (free tier) |

## Checklist de Validacao
- [x] TS-01 (plan real: 41 recursos, 20/10/2026)
- [x] TS-02
- [ ] TS-03..TS-07 — no proximo ciclo de deploy (cluster no ar)
