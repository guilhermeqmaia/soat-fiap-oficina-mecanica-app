# QA Plan — US-F3-06: Deploy da Aplicacao no EKS

## Resumo
Valida o `cd-aws.yml` e o overlay `k8s-aws/`: imagem no ECR por commit, manifestos no EKS, `DATABASE_URL` vindo do Secrets Manager, NLB interno alcancado pelo gateway, Job de migrations antes do rollout, probes/recursos, HPA, SPAs fora do EKS, rollout sem downtime + rollback, smoke test e README.

## Pre-requisitos
- Ambiente no ar (`scripts/aws-deploy-all.sh`) e kubeconfig do cluster
- `gh`, `aws` (profile `oficina`), `kubectl`, `curl`, `jq`
- Seeds carregados; tokens admin/cliente (QA_PLAN_US-F3-01)

## Cenarios de Teste

### TS-01: Imagem publicada no ECR com tag por commit
- **Tipo:** Ambos
- **Criterio:** Imagem no ECR (tag por commit/versao)
- **Passos:**
  1. `aws ecr describe-images --repository-name oficina-mecanica-app --query 'imageDetails[].imageTags' | jq -c`
  2. `kubectl -n oficina get deploy oficina-app -o jsonpath='{.spec.template.spec.containers[0].image}'`
- **Resultado esperado:** tags `<sha>` e `prod`; o Deployment usa a tag imutavel `<sha>` do run de CD; scan Trivy passou (CRITICAL bloqueia — evidencia: `tar` 6.2.1 bloqueou e foi corrigido)

### TS-02: Manifestos aplicados no EKS (overlay `k8s-aws/`)
- **Tipo:** Ambos
- **Criterio:** namespace, deployment, service, HPA, configmap, migrations-job
- **Passos:**
  1. `kubectl -n oficina get deploy,svc,hpa,cm,pdb,job`
- **Resultado esperado:** `oficina-app` (2/2), Service `LoadBalancer`, HPA 2–10, ConfigMap `oficina-app-config` (com `DB_SSL`, `JWT_ISSUER`, `PUBLIC_BASE_URL`=URL do gateway), PDB, Job `oficina-migrations` `Completed`

### TS-03: `DATABASE_URL` do Secret do RDS
- **Tipo:** Ambos
- **Criterio:** DATABASE_URL vem do Secret do RDS sincronizado do Secrets Manager
- **Passos:**
  1. Log do run de CD, step "Sincronizar Secrets (Secrets Manager -> cluster)"
  2. `kubectl -n oficina get secret oficina-db -o jsonpath='{.data}' | jq 'keys'`
  3. `kubectl -n oficina exec deploy/oficina-app -c app -- node -e "fetch('http://localhost:3000/health/ready').then(r=>r.json()).then(j=>console.log(JSON.stringify(j)))"`
- **Resultado esperado:** chaves `DATABASE_URL, DB_HOST, DB_PORT`; readiness `{"status":"ready","checks":{"database":{"status":"ok"}}}`

### TS-04: Backend alcancavel pelo gateway via NLB interno
- **Tipo:** Ambos
- **Criterio:** Alcancavel pelo API Gateway via NLB interno (desvio: sem ALB Controller)
- **Passos:**
  1. `kubectl -n oficina get svc oficina-app -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'`
  2. `aws elbv2 describe-load-balancers --query 'LoadBalancers[].[Scheme,Type]'`; `describe-target-health` do target group -> `healthy`
  3. `curl -s $GW/health` -> 200
- **Resultado esperado:** NLB `internal`/`network`; alvos saudaveis (NodePort, `externalTrafficPolicy: Local`); step do CD "Publicar endpoint interno" imprime o `backend_listener_arn` consumido pelo gateway

### TS-05: Migrations antes do rollout
- **Tipo:** Automatizado
- **Criterio:** Job de migrations roda antes do rollout
- **Passos:**
  1. Log do step "Deploy (kustomize) + migrations": `delete job` -> `apply -k` -> `wait --for=condition=complete job/oficina-migrations` -> `rollout status`
  2. `kubectl -n oficina logs job/oficina-migrations`
- **Resultado esperado:** Job usa a **mesma imagem do ECR** (recriado pelo kustomize); "18 migrations found ... No pending migrations" ou lista aplicada; rollout so depois

### TS-06: Probes e recursos
- **Tipo:** Manual
- **Criterio:** startup/liveness/readiness e requests/limits calibrados
- **Passos:**
  1. `kubectl -n oficina get deploy oficina-app -o yaml | grep -A6 -E "startupProbe|livenessProbe|readinessProbe|resources:"`
- **Resultado esperado:** `/health` (liveness) e `/health/ready` (readiness) com initialDelay/period definidos; requests/limits de CPU/memoria presentes; pods `1/1` sem restarts

### TS-07: HPA ativo
- **Tipo:** Ambos
- **Criterio:** HPA 2–10 (CPU 70% / mem 80%) com metrics-server
- **Passos:**
  1. `kubectl -n oficina get hpa oficina-app` — `TARGETS` mostra percentuais (nao `<unknown>`)
  2. Carga: ver QA_PLAN_US-F3-05 TS-05
- **Resultado esperado:** metricas lidas; replicas sobem sob carga

### TS-08: SPAs fora do EKS
- **Tipo:** Manual
- **Criterio:** Escopo — SPAs removidas do overlay
- **Passos:**
  1. `kubectl -n oficina get deploy,svc | grep -c web` -> 0
  2. `kustomize build k8s-aws | grep -c "oficina-web"` -> 0
- **Resultado esperado:** nenhum recurso `oficina-web-*`; patches `$patch: delete` no `k8s-aws/kustomization.yaml`

### TS-09: Rollout sem downtime e rollback
- **Tipo:** Ambos
- **Criterio:** `maxUnavailable: 0` + PDB + spread por AZ; rollback documentado
- **Passos:**
  1. Durante um redeploy (`gh workflow run cd-aws.yml`), rodar `while true; do curl -s -o /dev/null -w '%{http_code}\n' $GW/health; sleep 1; done`
  2. `kubectl -n oficina get pods -o wide` — pods em nodes/AZs distintos
  3. Rollback: `kubectl -n oficina rollout undo deployment/oficina-app && kubectl -n oficina rollout status deployment/oficina-app`
- **Resultado esperado:** 100% `200` durante o rollout (surge 1, unavailable 0); PDB `minAvailable 1`; rollback volta a revisao anterior em < 1 min (documentado em `k8s-aws/README.md`)

### TS-10: Smoke test pos-deploy
- **Tipo:** Automatizado
- **Criterio:** Smoke test (`/health`, `/health/ready`) no pipeline
- **Passos:**
  1. Log do step "Smoke test (/health e /health/ready)" do run de CD
- **Resultado esperado:** pod efemero `curlimages/curl` recebe 200 nos dois endpoints; falha derruba o run

### TS-11: README
- **Tipo:** Manual
- **Criterio:** README com passo a passo, rollback e deploy ativo
- **Resultado esperado:** `k8s-aws/README.md` + secao CI/CD do README raiz apontando para os scripts (ADR-0008)

## Casos de Borda
- Re-disparar o CD no mesmo commit (ex.: nova `GATEWAY_URL`): ConfigMap via `envFrom` so entra em pods novos — o CD faz `rollout restart`
- Sem `EKS_CLUSTER_NAME`: o CD para no push do ECR (aviso, nao falha)
- RDS parado (pause): readiness falha, pods `0/1`; o `aws-resume.sh` religa e escala a app de volta
- NLB recem-criado: 503 intermitente por ~1 min ate os alvos convergirem

## Rastreabilidade

| Criterio de Aceite | Cenarios |
|---|---|
| Imagem no ECR (tag por commit) | TS-01 |
| Manifestos aplicam no EKS (overlay) | TS-02 |
| `DATABASE_URL` do Secret do RDS | TS-03 |
| Alcancavel pelo gateway via NLB interno | TS-04 |
| Migrations antes do rollout | TS-05 |
| Probes e requests/limits | TS-06 |
| HPA ativo | TS-07 |
| SPAs fora do EKS | TS-08 |
| Rollout sem downtime + rollback | TS-09 |
| Smoke test pos-deploy | TS-10 |
| README | TS-11 |

## Checklist de Validacao
- [x] Todos os criterios cobertos
- [x] Casos de borda documentados
- [x] Fluxos de erro documentados
- [x] Instrucoes de setup claras

## Comandos Uteis
```bash
gh workflow run cd-aws.yml -R guilhermeqmaia/soat-fiap-oficina-mecanica-app --ref main
kubectl -n oficina rollout history deployment/oficina-app
```
