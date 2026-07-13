# Infraestrutura como Código — Terraform (US-F2-06)

Provisiona **cluster Kubernetes + banco de dados** para a app da oficina, em um cluster **`kind`** local (Kubernetes in Docker):

| Componente | Como |
|---|---|
| Cluster | `kind` via provider `tehcyx/kind` (não precisa do binário `kind`) |
| Banco | PostgreSQL no cluster (`postgres:16-alpine` via recursos `kubernetes_*` + PVC) |

> **Escopo:** apenas `kind`. Não há provisionamento em cloud (EKS/RDS) — o fluxo de entrega usa um cluster `kind` efêmero no CI para provar que o deploy funciona, conforme o plano da Fase 2.
>
> **Por que não Helm `bitnami/postgresql`?** Desde set/2025 a Bitnami moveu as imagens versionadas para `bitnamilegacy` (sem suporte) ou exige assinatura paga — o chart não funciona out-of-the-box. Usamos a imagem oficial `postgres:16-alpine`, gratuita e sem gate.

## Arquitetura (dois estados)

Separamos **criação do cluster** da **implantação dentro do cluster** — padrão recomendado pela HashiCorp para não configurar o provider `kubernetes` a partir de um recurso criado no mesmo apply (evita "provider configuration not known until apply" e destroy quebrado).

```
   ┌─────────────────────────┐                 ┌──────────────────────────────┐
   │   01-cluster (state #1) │   kubeconfig    │      02-app (state #2)        │
   │                         │   (config_path) │                              │
   │  kind_cluster           ├────────────────▶│  kubernetes_namespace        │
   │   + grava kubeconfig     │                 │  random_password             │
   │                         │   remote_state  │  kubernetes_secret oficina-db│ ◀── contrato US-F2-05
   │  outputs: kubeconfig,   ├────────────────▶│  Postgres (PVC + Deploy + Svc)│
   │   connect_command        │   (ordem)       │                              │
   └─────────────────────────┘                 └──────────────────────────────┘
```

O Postgres **não** está nos manifestos `k8s/` (US-F2-05) de propósito: a separação provisioning (IaC) ↔ application deploy é exigência do PDF da Fase 2.

## Pré-requisitos

- Docker em execução
- Terraform ≥ 1.6
- `kubectl` (para inspecionar/usar o cluster)

## Como aplicar

> **Atalho:** `bash scripts/local-k8s-up.sh` (na raiz do repo) roda estes dois
> stages e ainda faz build + `kind load` das imagens, `kubectl apply -k k8s/`,
> migrations e seeds em um único comando. Os passos abaixo mostram o fluxo manual.

Sempre na ordem **01 → 02** (o stage 02 lê o estado do 01).

```bash
# 1) Cluster
cd infra/terraform/01-cluster
terraform init
terraform apply

# Conecta o kubectl (o comando pronto exporta KUBECONFIG)
eval "$(terraform output -raw connect_command)"

# 2) Banco + namespace + Secret
cd ../02-app
terraform init
terraform apply
```

Depois disso a app é implantada pelos manifestos (US-F2-05):

```bash
# 3) App (US-F2-05) — consome o Secret 'oficina-db' criado acima
kubectl apply -k k8s/
# 4) O Job de migrations roda 'prisma migrate deploy' usando DATABASE_URL do Secret
```

**Ordem completa:** `(1) terraform apply 01 → 02` → `(2) kubectl apply -k k8s/` → `(3) Job de migrations`.

## O que é criado

| Recurso | Detalhe |
|---|---|
| Cluster | `kind_cluster` (1 control-plane + 2 workers) |
| Banco | Deployment `postgres:16-alpine` + PVC (`standard`) + Service ClusterIP |
| Namespace | `oficina` |
| Secret | `oficina-db` com `DATABASE_URL` (senha via `random_password`) |

### Contrato do Secret (interface com US-F2-05)

```
Secret  oficina-db   (namespace: oficina, dono: Terraform)
  DATABASE_URL  postgresql://<user>:<pass>@<host>:5432/<db>?schema=public   ← autoritativa
  DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD                               ← conveniência
```

Os manifestos da US-F2-05 referenciam `secretKeyRef{ name: oficina-db, key: DATABASE_URL }`. Os segredos da **aplicação** (`JWT_SECRET`, webhooks) ficam em um Secret **separado** (`oficina-app`), gerenciado pelo Kustomize — o Terraform não os toca (regra single-writer-per-Secret).

## Outputs principais

- `kubeconfig_path` — caminho do kubeconfig (`export KUBECONFIG=$(terraform output -raw kubeconfig_path)`)
- `database_endpoint` — host:port do banco (Service DNS interno)
- `app_namespace` — `oficina`
- `database_url` — connection string completa (sensitive: `terraform output -raw database_url`)
- `db_secret_name` — `oficina-db`
- `connect_command` — comando kubectl pronto

## Como destruir

```bash
kubectl delete -k k8s/                        # opcional: remove a app
cd infra/terraform/02-app   && terraform destroy
cd ../01-cluster            && terraform destroy
```

(O cluster `kind` é descartável: `terraform destroy` no stage 01 o remove por completo.)

## Qualidade

```bash
terraform -chdir=01-cluster fmt -check && terraform -chdir=01-cluster validate
terraform -chdir=02-app     fmt -check && terraform -chdir=02-app     validate
```

> `terraform validate` exige `terraform init` antes (baixa os providers).

## ⚠️ Notas (DEMO)

- Postgres single-instance, sem HA/backup — suficiente para o demo/CI em kind.
- O `tfstate` contém a senha do banco — está no `.gitignore` e deve ser tratado como sensível.
