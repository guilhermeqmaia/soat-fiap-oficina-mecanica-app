#!/usr/bin/env bash
#
# Abre os port-forwards da API e das UIs e mantém tudo vivo até Ctrl-C.
# Uso:   bash scripts/local-k8s-forward.sh
set -euo pipefail

NS=oficina
export KUBECONFIG="${KUBECONFIG:-$HOME/.kube/oficina-mecanica.config}"
echo "KUBECONFIG=$KUBECONFIG"

pids=()
cleanup() { echo; echo "Encerrando port-forwards..."; for p in "${pids[@]:-}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup INT TERM EXIT

kubectl port-forward -n "$NS" svc/oficina-app          3000:3000 >/dev/null 2>&1 & pids+=($!)
kubectl port-forward -n "$NS" svc/oficina-web-admin    8080:8080 >/dev/null 2>&1 & pids+=($!)
kubectl port-forward -n "$NS" svc/oficina-web-cliente  8081:8080 >/dev/null 2>&1 & pids+=($!)
sleep 3

cat <<EOF
Port-forwards ativos:
  API......: http://localhost:3000   (health: /health , /health/ready)
  Admin UI.: http://localhost:8080
  Cliente..: http://localhost:8081

Deixe este terminal aberto. Ctrl-C encerra os port-forwards.
EOF

wait
