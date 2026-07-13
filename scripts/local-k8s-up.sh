#!/usr/bin/env bash
#
# Sobe TODO o sistema (Fase 2) num cluster Kubernetes local (kind), do zero:
#   cluster (Terraform) -> Postgres + Secret oficina-db (Terraform)
#   -> build das imagens -> load no kind -> Secret oficina-app
#   -> kubectl apply -k k8s/ -> migrations -> rollout -> seeds -> metrics-server.
#
# Uso:   bash scripts/local-k8s-up.sh
# Idempotente: pode rodar de novo com segurança.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

NS=oficina
CLUSTER=oficina-local
KIND_CTX="kind-${CLUSTER}"
PG_LABEL="app.kubernetes.io/name=oficina-mecanica-postgres"
API_URL="http://localhost:3000"

log()  { printf "\n\033[1;36m==> %s\033[0m\n" "$*"; }
die()  { printf "\n\033[1;31mERRO: %s\033[0m\n" "$*" >&2; exit 1; }

# ---- 0) pré-requisitos ---------------------------------------------------
log "Checando pré-requisitos"
command -v docker    >/dev/null || die "docker não encontrado"
docker info >/dev/null 2>&1     || die "Docker não está rodando — abra o Docker Desktop e tente de novo."
command -v kubectl   >/dev/null || die "kubectl não encontrado"
command -v terraform >/dev/null || die "terraform não encontrado"
command -v openssl   >/dev/null || die "openssl não encontrado"
if ! command -v kind >/dev/null; then
  log "kind ausente — instalando via Homebrew"
  command -v brew >/dev/null || die "Homebrew ausente; instale o kind manualmente: https://kind.sigs.k8s.io"
  brew install kind
fi

# ---- 1) cluster kind (terraform 01-cluster) ------------------------------
log "Provisionando cluster kind (terraform 01-cluster)"
terraform -chdir=infra/terraform/01-cluster init  -input=false
terraform -chdir=infra/terraform/01-cluster apply -input=false -auto-approve

KUBECONFIG="$(terraform -chdir=infra/terraform/01-cluster output -raw kubeconfig_path)"
KUBECONFIG="${KUBECONFIG/#\~/$HOME}"   # expande ~ se vier literal
export KUBECONFIG
log "KUBECONFIG=$KUBECONFIG (contexto $KIND_CTX)"
kubectl cluster-info --context "$KIND_CTX" >/dev/null || die "cluster kind inacessível"

# ---- 2) namespace + Postgres + Secret oficina-db (terraform 02-app) ------
log "Provisionando namespace + Postgres + Secret oficina-db (terraform 02-app)"
terraform -chdir=infra/terraform/02-app init  -input=false
terraform -chdir=infra/terraform/02-app apply -input=false -auto-approve

# ---- 3) build das imagens + load no kind ---------------------------------
log "Buildando imagens Docker (API + 2 UIs)"
docker build -t oficina-mecanica-app:latest .
docker build --build-arg VITE_API_URL="$API_URL" -t oficina-mecanica-web-admin:latest   ./web/admin
docker build --build-arg VITE_API_URL="$API_URL" -t oficina-mecanica-web-cliente:latest ./web/cliente

log "Carregando imagens no cluster kind ($CLUSTER)"
for img in oficina-mecanica-app oficina-mecanica-web-admin oficina-mecanica-web-cliente; do
  kind load docker-image "$img:latest" --name "$CLUSTER"
done

# ---- 4) Secret da aplicação (oficina-app) --------------------------------
if [ ! -f k8s/secret.yaml ]; then
  log "Gerando k8s/secret.yaml a partir do template (segredos fortes)"
  cp k8s/secret.yaml.example k8s/secret.yaml
  JWT="$(openssl rand -base64 48)"
  WHT="$(openssl rand -hex 32)"
  NWS="$(openssl rand -hex 32)"
  sed -i '' "s|TROQUE_POR_openssl_rand_base64_48_com_no_minimo_32_chars|${JWT}|" k8s/secret.yaml
  sed -i '' "s|TROQUE_POR_token_forte_do_webhook_de_aprovacao|${WHT}|"           k8s/secret.yaml
  sed -i '' "s|TROQUE_POR_segredo_hmac_do_webhook_de_notificacao|${NWS}|"        k8s/secret.yaml
else
  log "k8s/secret.yaml já existe — mantendo o atual"
fi

# ---- 5) deploy da aplicação ----------------------------------------------
log "Aplicando manifests (kubectl apply -k k8s/)"
kubectl apply -k k8s/

# ---- 6) migrations + rollout ---------------------------------------------
if kubectl get job oficina-migrations -n "$NS" >/dev/null 2>&1; then
  log "Aguardando Job de migrations"
  kubectl wait --for=condition=complete job/oficina-migrations -n "$NS" --timeout=240s || {
    kubectl logs -n "$NS" job/oficina-migrations --tail=60 || true
    die "Job de migrations não completou"
  }
else
  log "Job de migrations já finalizado (TTL) — seguindo"
fi

log "Aguardando rollout dos deployments"
kubectl rollout status deployment/oficina-app         -n "$NS" --timeout=300s
kubectl rollout status deployment/oficina-web-admin   -n "$NS" --timeout=180s
kubectl rollout status deployment/oficina-web-cliente -n "$NS" --timeout=180s

# ---- 7) seeds (usuários + dados de teste) --------------------------------
log "Carregando seeds no Postgres"
kubectl wait --for=condition=ready pod -l "$PG_LABEL" -n "$NS" --timeout=120s
DBPOD="$(kubectl get pod -n "$NS" -l "$PG_LABEL" -o jsonpath='{.items[0].metadata.name}')"
[ -n "$DBPOD" ] || die "Pod do Postgres não encontrado (label $PG_LABEL)"
for f in 03_test_users.sql 01_test_data.sql 02_extensivo.sql 04_metricas_tempo.sql 05_notificacoes.sql; do
  log "  seed: $f"
  kubectl exec -i -n "$NS" "$DBPOD" -- psql -U oficina -d oficina_mecanica < "prisma/seeds/$f" \
    || log "  (seed $f retornou aviso — provavelmente já aplicado; ok)"
done

# ---- 8) metrics-server (necessário para o HPA) ---------------------------
log "Instalando metrics-server (necessário p/ o HPA escalar)"
K8S_NAMESPACE="$NS" K8S_HPA=oficina-app bash perf/scripts/install-metrics-server.sh \
  || log "metrics-server: cheque manualmente com 'kubectl get deploy metrics-server -n kube-system'"

# ---- pronto --------------------------------------------------------------
log "PRONTO ✅  Sistema no ar no cluster kind '$CLUSTER'"
kubectl get pods -n "$NS"

cat <<EOF

--------------------------------------------------------------------------
Para acessar e testar, abra OUTRO terminal e rode o helper de port-forward:

    bash scripts/local-k8s-forward.sh      # deixe rodando (Ctrl-C encerra)

Depois, num terceiro terminal:

    curl -s localhost:3000/health | jq
    TOKEN=\$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' \\
      -d '{"email":"admin@oficina.com","senha":"admin123"}' | jq -r '.accessToken')
    curl -s localhost:3000/ordens-servico -H "Authorization: Bearer \$TOKEN" | jq

  Admin UI: http://localhost:8080     Cliente UI: http://localhost:8081

Demo de auto-scaling (HPA):
    kubectl --kubeconfig $KUBECONFIG get hpa oficina-app -n $NS -w        # terminal A
    BASE_URL=http://localhost:3000 K8S_NAMESPACE=$NS \\
      K8S_DEPLOYMENT=oficina-app K8S_HPA=oficina-app bash perf/scripts/hpa-scale-test.sh   # terminal B

Swagger (desligado sob NODE_ENV=production; para habilitar):
    kubectl --kubeconfig $KUBECONFIG patch configmap oficina-app-config -n $NS \\
      --type merge -p '{"data":{"NODE_ENV":"development"}}'
    kubectl --kubeconfig $KUBECONFIG rollout restart deployment/oficina-app -n $NS
    # depois: http://localhost:3000/api
--------------------------------------------------------------------------
EOF
