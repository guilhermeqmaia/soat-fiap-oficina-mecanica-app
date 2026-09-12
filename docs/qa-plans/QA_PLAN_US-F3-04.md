# QA Plan — US-F3-04: Terraform — Banco de Dados Gerenciado (RDS)

## Resumo
Valida o repo `soat-fiap-oficina-infra-db`: RDS for PostgreSQL 16 **Multi-AZ**, em subnets privadas com SG restrito, senha gerada e guardada no Secrets Manager, outputs consumidos pela app/Lambda, backups/manutencao/`deletion_protection`, parametrizacao por ambiente, remote state e CI/CD.

## Pre-requisitos
- `aws` CLI (profile `oficina`), `gh` logado, `terraform` 1.9+
- Vars do repo preenchidas (`VPC_ID`, `DB_SUBNET_IDS`, `DB_ALLOWED_CIDRS`, `DB_BACKUP_RETENTION_DAYS`) — o `aws-deploy-all.sh` grava
- Para os cenarios de nuvem: ambiente no ar (`scripts/aws-deploy-all.sh`)

## Cenarios de Teste

### TS-01: RDS PostgreSQL provisionado por Terraform (versao compativel)
- **Tipo:** Ambos
- **Criterio:** Terraform provisiona RDS for PostgreSQL compativel com as migrations Prisma
- **Passos:**
  1. `aws rds describe-db-instances --db-instance-identifier oficina-mecanica-prod --query 'DBInstances[0].[Engine,EngineVersion,DBInstanceClass,DBInstanceStatus]'`
  2. Conferir que o Job `oficina-migrations` do app completou (`kubectl -n oficina get job`)
- **Resultado esperado:** `postgres 16.x`, `db.t3.micro`, `available`; 18 migrations aplicadas (log do pod do app: "Applying migration ...")

### TS-02: Multi-AZ
- **Tipo:** Manual
- **Criterio:** Multi-AZ habilitado
- **Passos:**
  1. `aws rds describe-db-instances --query 'DBInstances[0].[MultiAZ,AvailabilityZone,SecondaryAvailabilityZone]'`
- **Resultado esperado:** `True`, AZ primaria e secundaria distintas (evidencia 12/09/2026: `True us-east-1a/us-east-1b`)

### TS-03: Sem exposicao publica; acesso so da VPC
- **Tipo:** Ambos
- **Criterio:** subnet group privado + SG restrito
- **Passos:**
  1. `aws rds describe-db-instances --query 'DBInstances[0].[PubliclyAccessible,DBSubnetGroup.Subnets[].SubnetIdentifier,VpcSecurityGroups[].VpcSecurityGroupId]'`
  2. `aws ec2 describe-security-group-rules --filters Name=group-id,Values=<sg> --query 'SecurityGroupRules[?IsEgress==`false`].[FromPort,CidrIpv4,ReferencedGroupInfo.GroupId]'`
  3. Do seu computador: `nc -zv -w 3 <endpoint> 5432`
- **Resultado esperado:** `PubliclyAccessible=False`; subnets = privadas do cluster; ingress 5432 apenas do CIDR da VPC (`10.0.0.0/16`) e/ou SGs informados; conexao externa falha (timeout)

### TS-04: Senha gerada e guardada no Secrets Manager, fora do state/outputs
- **Tipo:** Ambos
- **Criterio:** `random_password` + Secrets Manager; nunca em texto plano
- **Passos:**
  1. `aws secretsmanager get-secret-value --secret-id oficina-mecanica-prod/database --query SecretString --output text | jq 'keys'`
  2. `terraform output` (no CD ou local) — conferir que nao ha senha em output
  3. `aws s3 cp s3://<bucket>/oficina-infra-db/prod.tfstate - | jq '.outputs | keys'`
- **Resultado esperado:** chaves `DATABASE_URL, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD`; outputs sao `db_endpoint`, `secret_arn`, `secret_name`, ... (sem senha; o state contem a senha por natureza e por isso o bucket e privado/criptografado)

### TS-05: Contrato consumido pela app e pela Lambda
- **Tipo:** Ambos
- **Criterio:** Output com endpoint e referencia ao secret; contrato de `DATABASE_URL`
- **Passos:**
  1. CD do app (`cd-aws.yml`, step "Sincronizar Secrets") le `DB_SECRET_ID=oficina-mecanica-prod/database` e cria o Secret k8s `oficina-db`
  2. `kubectl -n oficina get secret oficina-db -o jsonpath='{.data.DATABASE_URL}' | base64 -d | sed 's/:[^:@]*@/:***@/'`
  3. `GET $GW/health/ready` -> 200 (`checks.database.status = ok`)
- **Resultado esperado:** `postgresql://oficina:***@<endpoint>:5432/oficina_mecanica?schema=public`; readiness ok (TLS ligado por `DB_SSL=true` — o RDS exige `rds.force_ssl`)

### TS-06: Backups, manutencao e `deletion_protection`
- **Tipo:** Manual
- **Criterio:** Backups automaticos + janela de manutencao + `deletion_protection` em prod
- **Passos:**
  1. `aws rds describe-db-instances --query 'DBInstances[0].[BackupRetentionPeriod,PreferredBackupWindow,PreferredMaintenanceWindow,DeletionProtection]'`
- **Resultado esperado:** retencao `1` no plano Free (`DB_BACKUP_RETENTION_DAYS`; default 7 em conta paga), janelas `03:00-04:00` / `mon:04:30-mon:05:30`, `DeletionProtection=True` em prod (o `aws-destroy-all.sh` desliga antes do destroy)

### TS-07: Parametrizacao por ambiente
- **Tipo:** Ambos
- **Criterio:** homolog/prod via tfvars/TF_VAR
- **Passos:**
  1. `cd.yml`: push em `homolog` -> `TF_ENV=homolog` (skip_final_snapshot, sem deletion_protection); `main` -> `prod`
  2. `terraform plan -var environment=homolog ...` local: `deletion_protection=false`, `skip_final_snapshot=true`
- **Resultado esperado:** `locals.tf` deriva os defaults seguros por ambiente; state key por ambiente (`oficina-infra-db/<env>.tfstate`)

### TS-08: Remote state (S3 + DynamoDB)
- **Tipo:** Manual
- **Criterio:** Remote state com lock
- **Passos:**
  1. `aws s3 ls s3://soat-oficina-tfstate-<conta>/oficina-infra-db/`
  2. `aws dynamodb describe-table --table-name soat-oficina-tflock --query Table.TableStatus`
- **Resultado esperado:** `prod.tfstate` versionado; tabela de lock `ACTIVE` (criada pelo `aws-account-bootstrap.sh`)

### TS-09: CI (`fmt`/`validate`/`plan`) e CD (`apply`)
- **Tipo:** Automatizado
- **Criterio:** CI no PR; apply no deploy automatico
- **Passos:**
  1. Abrir um PR no repo: `ci.yml` roda `fmt -check`, `validate` e comenta o `plan`
  2. Merge em `main`: `cd.yml` faz `apply` (run "CD - Terraform apply")
- **Resultado esperado:** checks verdes; run de CD com `Apply complete` (evidencia 12/09/2026: 7 recursos)

### TS-10: README
- **Tipo:** Manual
- **Criterio:** README com recursos, como aplicar, diagrama, variaveis, custo
- **Passos:** ler `README.md` do repo
- **Resultado esperado:** secoes presentes, inclusive as vars do CI e a nota do plano Free

## Casos de Borda
- Plano Free da AWS: `backup_retention_period` > 1 falha com `FreeTierRestrictionError` — configuravel por var
- Descricao do SG com caracteres fora de ASCII e rejeitada pela EC2 (corrigido)
- Recriar o secret com o mesmo nome apos destroy: `recovery_window_in_days = 0`
- Destroy em prod: precisa desligar `deletion_protection` (apply) antes do destroy

## Rastreabilidade

| Criterio de Aceite | Cenarios |
|---|---|
| RDS PostgreSQL compativel | TS-01 |
| Multi-AZ | TS-02 |
| Subnets privadas + SG restrito | TS-03 |
| Senha no Secrets Manager | TS-04 |
| Outputs endpoint/secret consumidos | TS-05 |
| Backups, manutencao, deletion_protection | TS-06 |
| Parametrizacao por ambiente | TS-07 |
| Remote state | TS-08 |
| CI plan / CD apply | TS-09 |
| README | TS-10 |
| Contrato `DATABASE_URL` | TS-05 |

## Checklist de Validacao
- [x] Todos os criterios cobertos
- [x] Casos de borda documentados
- [x] Fluxos de erro documentados
- [x] Instrucoes de setup claras

## Comandos Uteis
```bash
aws rds describe-db-instances --db-instance-identifier oficina-mecanica-prod --output table
gh workflow run cd.yml -R guilhermeqmaia/soat-fiap-oficina-infra-db -f action=plan
```
