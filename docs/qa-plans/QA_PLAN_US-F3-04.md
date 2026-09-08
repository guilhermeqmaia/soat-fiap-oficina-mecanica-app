# QA Plan — US-F3-04: Terraform — Banco de Dados Gerenciado (RDS)

## Summary
Valida o provisionamento do RDS for PostgreSQL via Terraform (`soat-fiap-oficina-infra-db`): Multi-AZ, isolamento de rede (subnets privadas + security group), segredo no Secrets Manager, backups/deletion protection, remote state e o contrato de `DATABASE_URL` esperado pela aplicacao.

## Prerequisites
- Terraform 1.9.8, acesso as credenciais AWS (conta AWS Academy/Learner Lab)
- Acesso ao repositorio `soat-fiap-oficina-infra-db`
- Para validacao end-to-end: cluster EKS ja provisionado ([QA_PLAN_US-F3-05](QA_PLAN_US-F3-05.md)) para testar o security group

## Test Scenarios

### TS-01: Terraform fmt/validate/plan no CI
- **Type:** Automated (CI)
- **Acceptance criterion:** terraform fmt/validate/plan no CI; apply no deploy automatico
- **Steps:**
  1. `terraform fmt -check -diff`
  2. `terraform init -backend=false -input=false`
  3. `terraform validate`
- **Expected result:** Sucesso nos 3 passos (gate do PR)

### TS-02: RDS PostgreSQL provisionado com versao compativel
- **Type:** Manual/config
- **Acceptance criterion:** RDS for PostgreSQL, versao compativel com as migrations Prisma
- **Steps:**
  1. `terraform plan` e revisar `engine_version` do `aws_db_instance`
  2. Comparar com a versao do Postgres usada no `docker-compose` local (Fase 2) e com o `provider` do Prisma
- **Expected result:** Versao igual ou superior a usada em dev, sem quebrar as migrations existentes

### TS-03: Multi-AZ habilitado
- **Type:** Manual/config
- **Steps:**
  1. Revisar `multi_az = true` no recurso `aws_db_instance`
  2. (Se aplicado) Console AWS -> RDS -> confirmar "Multi-AZ" no describe da instancia
- **Expected result:** Multi-AZ ativo

### TS-04: Isolamento de rede — subnets privadas e security group
- **Type:** Manual/config
- **Acceptance criterion:** db_subnet_group em subnets privadas + SG restringindo acesso ao EKS
- **Steps:**
  1. Revisar `aws_db_subnet_group` — subnets sem rota direta a Internet Gateway
  2. Revisar `aws_security_group` do RDS — ingress apenas do SG/CIDR do cluster EKS na porta 5432
  3. Tentar conectar ao endpoint do RDS de fora da VPC (deve falhar/timeout)
- **Expected result:** RDS inacessivel publicamente; acessivel apenas a partir do EKS

### TS-05: Senha via Secrets Manager, nunca em texto plano
- **Type:** Manual/config
- **Acceptance criterion:** Senha gerada por random_password e armazenada no Secrets Manager
- **Steps:**
  1. Revisar o recurso `random_password` e o `aws_secretsmanager_secret`/`_version`
  2. `terraform show`/`state show` no recurso do RDS — confirmar que a senha nao aparece em texto plano no state nem em outputs
  3. `grep` no output do `terraform plan`/`apply` por senha em texto plano (nao deve aparecer)
- **Expected result:** Senha marcada como sensitive; nunca exposta em logs, state legivel ou outputs

### TS-06: Output do endpoint consumido pela aplicacao
- **Type:** Manual/config
- **Acceptance criterion:** Output com endpoint + referencia ao secret
- **Steps:**
  1. `terraform output` — conferir `rds_endpoint` (ou nome equivalente) e ARN/nome do secret
  2. Confirmar que o pipeline do repo da app (CD) consome esse output (via SSM Parameter Store / remote state data source) para popular o Secret `oficina-db` do K8s
- **Expected result:** Endpoint e secret corretamente propagados; `DATABASE_URL` final no cluster aponta para o RDS

### TS-07: Backups, janela de manutencao e deletion protection
- **Type:** Manual/config
- **Steps:**
  1. Revisar `backup_retention_period`, `maintenance_window`, `backup_window`
  2. Revisar `deletion_protection = true` no ambiente de producao (`prod.tfvars` ou workspace `prod`)
- **Expected result:** Backups automaticos configurados; `deletion_protection` ativo em prod (pode ser `false` em homolog, documentar a diferenca)

### TS-08: Parametrizacao por ambiente
- **Type:** Manual/config
- **Steps:**
  1. Conferir `terraform.tfvars.example` e a estrategia de workspaces/tfvars para homolog vs. producao
  2. Rodar `terraform workspace list` (se workspaces) ou conferir os arquivos `*.tfvars` por ambiente
- **Expected result:** Variaveis (tamanho da instancia, multi-AZ, retention) parametrizaveis sem duplicar codigo

### TS-09: Remote state (S3 + DynamoDB lock)
- **Type:** Manual/config
- **Acceptance criterion:** Remote state configurado
- **Steps:**
  1. Revisar `backend "s3"` em `versions.tf`/`providers.tf` — bucket e `dynamodb_table` para lock
  2. Rodar `terraform init` real (com backend) e confirmar que o state fica no S3, nao local
- **Expected result:** State remoto com lock funcionando (2 `apply` simultaneos devem serializar, nao corromper)

### TS-10: Contrato de DATABASE_URL mantido
- **Type:** Automated (integration, no repo da app) / Manual
- **Acceptance criterion:** Mantido o contrato de DATABASE_URL esperado pela app e pelo Job de migrations
- **Steps:**
  1. Rodar `prisma migrate deploy` (Job de migrations) apontando para o RDS provisionado
  2. Rodar a suite `test:integration` da app contra o RDS (ambiente de homologacao)
- **Expected result:** Migrations aplicam sem erro; testes de integracao passam

### TS-11: README do repo completo
- **Type:** Manual — ver tambem [f3-doc-05](../user-stories/f3-doc-05-readmes-por-repo.md)
- **Acceptance criterion:** README do repo: recursos criados, como aplicar, diagrama, variaveis, custo estimado
- **Steps:**
  1. Abrir o README do repo `soat-fiap-oficina-infra-db`
  2. Confirmar presenca de: recursos criados, como aplicar o Terraform, diagrama, variaveis disponiveis, custo estimado
- **Expected result:** README completo, cobrindo todos os itens acima

## Edge Cases
- `terraform destroy` acidental em producao — validar que `deletion_protection` bloqueia
- Rotacao do secret no Secrets Manager sem atualizar o Secret do K8s — app deve falhar de forma visivel (CrashLoop com log claro), nao silenciosamente
- Falha de rede entre EKS e RDS (SG mal configurado) — health check `/health/ready` deve refletir a falha

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| Terraform provisiona RDS PostgreSQL compativel | TS-01, TS-02 |
| Multi-AZ | TS-03 |
| Subnets privadas + SG restrito | TS-04 |
| Senha via Secrets Manager | TS-05 |
| Output endpoint + secret | TS-06 |
| Backups + manutencao + deletion protection | TS-07 |
| Parametrizacao por ambiente | TS-08 |
| Remote state (S3 + DynamoDB lock) | TS-09 |
| Contrato de DATABASE_URL mantido | TS-10 |
| README do repo | TS-11 |

## Validation Checklist
- [ ] Todos os criterios de aceite cobertos
- [ ] Edge cases documentados
- [ ] Fluxos de erro documentados
- [ ] Instrucoes de setup claras

## Useful Commands
```bash
terraform fmt -check -diff
terraform init -backend=false -input=false
terraform validate

# Com credenciais AWS reais
terraform init
terraform plan
terraform output

# No repo da aplicacao, apos o RDS estar no ar
npm run prisma:deploy
npm run test:integration
```

## Status
Nao implementado ainda no repositorio no momento da escrita deste plano (`docs/qa-plans/`, `README.md`, `CLAUDE.md` presentes, sem arquivos `.tf`) — este QA Plan serve de guia de teste para quando a US-F3-04 for implementada.
