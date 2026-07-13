# Deploy em Kubernetes — Manifestos da Aplicação (US-F2-05)

Manifestos Kustomize da **aplicação** (API NestJS) e das duas **UIs** (SPAs
Admin e Cliente, servidas por nginx). O **cluster e o banco** são provisionados
via Terraform (US-F2-06) — ver [`infra/terraform/`](../infra/terraform/README.md).
A separação provisioning (IaC) ↔ application deploy é exigência da Fase 2.

## O que tem aqui

| Arquivo | Recurso |
|---|---|
| `namespace.yaml` | Namespace `oficina` |
| `configmap.yaml` | `oficina-app-config` — env não sensíveis (`PORT`, `NODE_ENV`, `NOTIFICATION_PROVIDER`, …) |
| `secret.yaml.example` | Template do Secret `oficina-app` — copie para `secret.yaml` (não commitado) |
| `migrations-job.yaml` | Job `oficina-migrations` — roda `prisma migrate deploy` |
| `app/deployment.yaml` | Deployment `oficina-app` — 2 réplicas, probes, resources |
| `app/service.yaml` | Service ClusterIP `oficina-app` (porta 3000) |
| `app/hpa.yaml` | HPA — CPU 70% / memória 80%, min 2 / max 10 |
| `web/admin-deployment.yaml` | Deployment `oficina-web-admin` — SPA Admin (nginx), porta 8080 |
| `web/admin-service.yaml` | Service ClusterIP `oficina-web-admin` (porta 8080) |
| `web/cliente-deployment.yaml` | Deployment `oficina-web-cliente` — SPA Cliente (nginx), porta 8080 |
| `web/cliente-service.yaml` | Service ClusterIP `oficina-web-cliente` (porta 8080) |
| `kustomization.yaml` | Agrega tudo no namespace `oficina` |

### Contrato de Secrets (single-writer-per-Secret)

| Secret | Dono | Conteúdo |
|---|---|---|
| `oficina-db` | **Terraform** (US-F2-06) | `DATABASE_URL` (+ `DB_HOST/PORT/NAME/USER/PASSWORD`) |
| `oficina-app` | **Kustomize** (esta story) | `JWT_SECRET`, `WEBHOOK_APPROVAL_TOKEN`, `NOTIFICATION_WEBHOOK_SECRET` |

O Deployment lê `DATABASE_URL` de `oficina-db` via `secretKeyRef` — **sem hardcode**.
Cada dono escreve só o seu Secret, evitando disputa entre Terraform e Kustomize.

## Pré-requisitos

- Cluster + banco já provisionados pelo Terraform (cria o Secret `oficina-db`):
  ```bash
  cd infra/terraform/01-cluster && terraform init && terraform apply
  eval "$(terraform output -raw connect_command)"
  cd ../02-app && terraform init && terraform apply
  ```
- `kubectl` apontando para o cluster (o `connect_command` acima já exporta `KUBECONFIG`).
- Imagem da app disponível no cluster (ver passo 2).

## Deploy passo a passo

> **Atalho:** `bash scripts/local-k8s-up.sh` sobe tudo de uma vez (terraform →
> build → `kind load` → `kubectl apply -k` → migrations → seeds → metrics-server)
> e `bash scripts/local-k8s-forward.sh` abre os port-forwards (API 3000, admin
> 8080, cliente 8081). O passo a passo abaixo faz o mesmo manualmente.

Ordem: **(1) terraform apply → (2) build + load da imagem → (3) kubectl apply -k k8s/**

```bash
# 1) Secret da aplicação (a partir do template — NÃO commitar o real)
cp k8s/secret.yaml.example k8s/secret.yaml
# edite k8s/secret.yaml: gere JWT_SECRET forte -> openssl rand -base64 48

# 2) Imagem da app dentro do cluster kind
docker build -t oficina-mecanica-app:latest .
kind load docker-image oficina-mecanica-app:latest --name oficina-local

# 3) Aplica os manifestos
kubectl apply -k k8s/

# Acompanhe
kubectl get pods -n oficina -w
kubectl logs -n oficina job/oficina-migrations
```

> **Imagem de um registry (EKS/GKE/GHCR):** em vez do `kind load`, sobrescreva a
> imagem — `cd k8s && kustomize edit set image oficina-mecanica-app=ghcr.io/<owner>/<repo>:<tag>`
> — e garanta o `imagePullSecret` se o registry for privado.

### Acessar a API

```bash
kubectl port-forward -n oficina svc/oficina-app 3000:3000
curl localhost:3000/health          # liveness
curl localhost:3000/health/ready    # readiness (checa o banco)
```

## UIs (SPAs Admin e Cliente)

Os dois front-ends (`web/admin`, `web/cliente`) são SPAs React/Vite servidas por
**nginx-unprivileged** (uid 101, escutando na **8080**, com fallback SPA para
`index.html`). Cada um tem um Deployment (1 réplica) + Service ClusterIP.

| Recurso | Deployment | Service (ClusterIP) | Imagem (kustomize) |
|---|---|---|---|
| UI Admin | `oficina-web-admin` | `oficina-web-admin:8080` | `oficina-mecanica-web-admin` |
| UI Cliente | `oficina-web-cliente` | `oficina-web-cliente:8080` | `oficina-mecanica-web-cliente` |

Os nomes de imagem seguem o mesmo padrão do `oficina-mecanica-app`, com sufixo
`-web-admin` / `-web-cliente`. Em GHCR ficariam
`ghcr.io/<owner>/<repo>-web-admin` e `…-web-cliente`.

### ⚠️ `VITE_API_URL` é baked em BUILD time

O Vite injeta `VITE_API_URL` **no bundle durante o `npm run build`** — não é lido
em runtime. Logo, definir env no pod **não** muda a URL da API. Para o cluster,
faça o build passando a URL da API acessível **pelo navegador** (não `localhost`
de dentro do pod) como build-arg:

```bash
# API alcançada via port-forward no host -> localhost:3000
docker build --build-arg VITE_API_URL=http://localhost:3000 \
  -t oficina-mecanica-web-admin:latest   ./web/admin
docker build --build-arg VITE_API_URL=http://localhost:3000 \
  -t oficina-mecanica-web-cliente:latest ./web/cliente

# carrega no kind (ou publique no GHCR e faça `kustomize edit set image …`)
kind load docker-image oficina-mecanica-web-admin:latest   --name oficina-local
kind load docker-image oficina-mecanica-web-cliente:latest --name oficina-local
```

Com **ingress/domínio real**, use `VITE_API_URL=https://api.suaoficina.com`.
Ver `web/admin/.env.example` e `web/cliente/.env.example`.

### Acessar as UIs (sem ingress no MVP)

Sem ingress, o acesso é por `kubectl port-forward` para cada Service. As portas de
host abaixo (8080 admin, 8081 cliente) espelham o `docker-compose` e são as origens
já liberadas em `WEB_ORIGINS` (ver `configmap.yaml`):

```bash
kubectl port-forward -n oficina svc/oficina-web-admin   8080:8080   # Admin   -> http://localhost:8080
kubectl port-forward -n oficina svc/oficina-web-cliente 8081:8080   # Cliente -> http://localhost:8081
kubectl port-forward -n oficina svc/oficina-app         3000:3000   # API     -> http://localhost:3000
```

> Como a UI foi buildada com `VITE_API_URL=http://localhost:3000`, mantenha o
> port-forward da API na 3000 aberto enquanto usa as SPAs no navegador. Se mudar
> a URL da API, rebuilde a imagem da UI **e** ajuste `WEB_ORIGINS` no ConfigMap.

## Validar o HPA (escala sob carga)

O HPA precisa do **metrics-server** (não vem no kind):

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
# kind: permita TLS inseguro do kubelet
kubectl -n kube-system patch deployment metrics-server --type=json \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'

# gere carga e observe escalar
kubectl get hpa -n oficina -w
```

## Remover

```bash
kubectl delete -k k8s/
# o cluster/banco saem com `terraform destroy` (ver infra/terraform/README.md)
```

## Notas de design

- **Probes** usam o health check da US-F2-11: `/health` (liveness, não toca o
  banco) e `/health/ready` (readiness, faz `SELECT 1`). Um pod só entra no
  Service quando o banco responde.
- **Migrations**: o Job `oficina-migrations` é o passo explícito e auditável. O
  container da app também roda `prisma migrate deploy` no start (CMD do
  Dockerfile); o advisory lock do Postgres serializa Job + réplicas com segurança.
- **`initContainer wait-for-db`** evita crashloop enquanto o Postgres ainda não
  aceita conexão.
