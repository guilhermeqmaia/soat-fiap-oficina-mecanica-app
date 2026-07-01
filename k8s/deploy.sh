#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
NAMESPACE=oficina
MIGRATIONS_JOB=oficina-migrations

if [ ! -f "$SCRIPT_DIR/secret.yaml" ]; then
  echo "Missing $SCRIPT_DIR/secret.yaml. Copy secret.yaml.example and replace all placeholder values first." >&2
  exit 1
fi

kubectl apply -f "$SCRIPT_DIR/namespace.yaml"
if ! kubectl get secret oficina-db -n "$NAMESPACE" >/dev/null 2>&1; then
  echo "Missing secret oficina-db in namespace $NAMESPACE. Run the infrastructure step before deploying the app." >&2
  exit 1
fi

kubectl apply -f "$SCRIPT_DIR/secret.yaml"

# Jobs have immutable pod templates. Recreate it on every deploy so migrations
# run for the image configured in kustomization.yaml before the API rolls out.
kubectl delete job "$MIGRATIONS_JOB" -n "$NAMESPACE" --ignore-not-found
kubectl apply -k "$SCRIPT_DIR"
kubectl wait --for=condition=complete "job/$MIGRATIONS_JOB" -n "$NAMESPACE" --timeout=300s
kubectl rollout status deployment/oficina-api -n "$NAMESPACE"
