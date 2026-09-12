# QA Plan — US-F3-05: Terraform — Cluster Kubernetes Gerenciado (EKS)

## Resumo
Valida o stage `cluster/` do repo `soat-fiap-oficina-infra-k8s`: VPC multi-AZ (publicas/privadas, NAT), EKS com managed node group, metrics-server e add-ons, HPA sob carga, alcance pelo API Gateway, remote state, ambientes, CI/CD e outputs. Registra os desvios conscientes (sem IRSA/ALB Controller — NLB in-tree) herdados do desenho para o AWS Academy e mantidos na conta propria (ADR-0007/0008).

## Pre-requisitos
- Ambiente no ar (`scripts/aws-deploy-all.sh`); `aws eks update-kubeconfig --name oficina-mecanica-eks`
- `kubectl`, `k6` (cenario de HPA), `aws` CLI (profile `oficina`)
- Acesso admin ao cluster: `CLUSTER_ADMIN_ARNS` (access entry) ou ser quem rodou o apply

## Cenarios de Teste

### TS-01: VPC multi-AZ com subnets publicas/privadas e NAT
- **Tipo:** Manual
- **Criterio:** VPC (publicas/privadas, NAT, multi-AZ)
- **Passos:**
  1. `aws ec2 describe-subnets --filters Name=tag:Name,Values='oficina-mecanica-*' --query 'Subnets[].[Tags[?Key==`Name`].Value|[0],AvailabilityZone,MapPublicIpOnLaunch]' --output table`
  2. `aws ec2 describe-nat-gateways --filter Name=state,Values=available --query 'NatGateways[].SubnetId'`
- **Resultado esperado:** 2 publicas + 2 privadas em `us-east-1a`/`1b`; 1 NAT numa subnet publica; rota default das privadas via NAT

### TS-02: Cluster EKS e managed node group escalavel
- **Tipo:** Manual
- **Criterio:** Cluster EKS; managed node group com escalabilidade
- **Passos:**
  1. `aws eks describe-cluster --name oficina-mecanica-eks --query 'cluster.[status,version,resourcesVpcConfig.endpointPublicAccess]'`
  2. `aws eks describe-nodegroup --cluster-name oficina-mecanica-eks --nodegroup-name oficina-mecanica-nodes --query 'nodegroup.[status,instanceTypes,scalingConfig]'`
  3. `kubectl get nodes -o wide`
- **Resultado esperado:** `ACTIVE`, `1.31`; node group `ACTIVE`, `m7i-flex.large` (plano Free) ou `t3.medium`, `min 2 / max 4`; 2 nodes `Ready` em AZs distintas

### TS-03: metrics-server e add-ons
- **Tipo:** Manual
- **Criterio:** metrics-server; CNI, CoreDNS (e kube-proxy)
- **Passos:**
  1. `aws eks list-addons --cluster-name oficina-mecanica-eks`
  2. `kubectl top nodes && kubectl top pods -n oficina`
- **Resultado esperado:** add-ons `vpc-cni, coredns, kube-proxy, metrics-server`; `kubectl top` responde (pre-requisito do HPA)

### TS-04: Desvio consciente — sem IRSA / AWS Load Balancer Controller
- **Tipo:** Manual
- **Criterio:** AWS Load Balancer Controller + IRSA (criterio original)
- **Passos:**
  1. Ler `cluster/README.md` (tabela "IAM: AWS Academy ou conta propria") e `k8s-aws/README.md` do app
  2. `kubectl -n oficina get svc oficina-app -o jsonpath='{.metadata.annotations}'`
- **Resultado esperado:** documentado que o app e exposto por **NLB interno via provider in-tree** (annotations `aws-load-balancer-type: nlb`, `internal: true`), sem IRSA — mesmo contrato (listener de LB interno) para o VPC Link; o segredo do Datadog vem de Secret do cluster. Na conta propria as roles do cluster/nodes sao criadas pelo Terraform (`iam.tf`)

### TS-05: HPA sob carga real
- **Tipo:** Ambos
- **Criterio:** Escalabilidade comprovada: HPA por CPU/memoria funcionando
- **Passos:**
  1. `kubectl -n oficina get hpa oficina-app` (min 2, max 10, CPU 70% / mem 80%)
  2. Gerar carga pelo gateway: `JWT_SECRET=$(aws secretsmanager get-secret-value --secret-id oficina-auth-prod/jwt --query SecretString --output text | jq -r .JWT_SECRET); k6 run perf/load.js -e BASE_URL=$GW -e JWT_SECRET=$JWT_SECRET -e VUS=60 -e DURATION=6m`
  3. Em paralelo: `kubectl -n oficina get hpa,pods -w`
- **Resultado esperado:** CPU alvo ultrapassa 70%, `REPLICAS` sobe de 2 (ate o limite 10 conforme a carga) e volta apos o cooldown; nodes absorvem os pods (ou o node group escala ate 4). Evidencia registrada em `docs/qa-plans/evidencias/` quando executado

### TS-06: Alcancavel pelo API Gateway
- **Tipo:** Ambos
- **Criterio:** Integracao com o API Gateway
- **Passos:**
  1. `curl -s $GW/health` -> 200 (VPC Link -> NLB interno -> NodePort)
- **Resultado esperado:** 200 em < 1 s; QA_PLAN_US-F3-02 TS-06 detalha o caminho

### TS-07: Remote state e parametrizacao por ambiente
- **Tipo:** Manual
- **Criterio:** Remote state (S3); homolog/prod
- **Passos:**
  1. `aws s3 ls s3://soat-oficina-tfstate-<conta>/oficina-infra-k8s/cluster/`
  2. `cd.yml`: `homolog` -> `homolog.tfstate`, `main` -> `prod.tfstate`
- **Resultado esperado:** state por stage e ambiente; lock via S3 (sem DynamoDB neste repo — documentado)

### TS-08: CI (`fmt`/`validate`/`plan`) e CD (`apply`)
- **Tipo:** Automatizado
- **Criterio:** CI no PR; apply no merge
- **Passos:**
  1. PR no repo: jobs `fmt + validate (cluster|gateway|observability)` e `plan comentado no PR (cluster|gateway)`
  2. Merge em `main` ou `gh workflow run cd.yml -f action=apply -f stage=cluster`
- **Resultado esperado:** plan real via OIDC comentado (`Plan: N to add`); CD `Apply complete` (evidencia 12/09/2026: 33–35 recursos)

### TS-09: Outputs consumidos pelos outros repos
- **Tipo:** Ambos
- **Criterio:** Outputs (nome do cluster, endpoint, kubeconfig, subnets, SGs)
- **Passos:**
  1. `aws s3 cp s3://<bucket>/oficina-infra-k8s/cluster/prod.tfstate - | jq '.outputs | keys'`
  2. Conferir as GitHub Variables gravadas pelo `aws-deploy-all.sh` (`gh variable list -R ...`)
- **Resultado esperado:** `cluster_name, cluster_endpoint, kubeconfig_command, vpc_id, vpc_cidr, private_subnet_ids, public_subnet_ids, vpc_link_security_group_id, auth_lambda_security_group_id, cluster_role_arn, node_role_arn`; vars `EKS_CLUSTER_NAME`, `DB_SUBNET_IDS`, `SUBNET_IDS`, `SECURITY_GROUP_IDS`, `VPC_LINK_*` preenchidas

### TS-10: README
- **Tipo:** Manual
- **Criterio:** README com recursos, como aplicar, diagrama de rede, variaveis, custo
- **Resultado esperado:** `cluster/README.md` com topologia, contratos, IAM dual-mode, nota do plano Free e custo; README raiz com scripts de subir/pausar/derrubar

## Casos de Borda
- Plano Free: `t3.medium` nao e free-tier-eligible — node group fica `CREATE_FAILED`; usar `NODE_INSTANCE_TYPES=["m7i-flex.large"]`
- Descricao de regra de SG com `>` e rejeitada pela EC2 (corrigido)
- Pause (`aws-pause.sh`): PDB `minAvailable 1` bloqueia o drain se a app estiver `0/1` — a app e zerada antes dos nos
- Destroy: ENIs da Lambda no SG `auth-lambda` precisam sumir antes da VPC

## Rastreabilidade

| Criterio de Aceite | Cenarios |
|---|---|
| VPC publicas/privadas, NAT, multi-AZ + EKS | TS-01, TS-02 |
| Managed node group escalavel | TS-02, TS-05 |
| metrics-server | TS-03 |
| Add-ons (LB Controller, CNI, CoreDNS) | TS-03, TS-04 (desvio) |
| IRSA | TS-04 (desvio documentado) |
| HPA comprovado sob carga | TS-05 |
| Integracao com o API Gateway | TS-06 |
| Remote state | TS-07 |
| Parametrizacao por ambiente | TS-07 |
| CI plan / CD apply | TS-08 |
| Outputs consumidos | TS-09 |
| README | TS-10 |

## Checklist de Validacao
- [x] Todos os criterios cobertos (2 como desvio consciente documentado)
- [x] Casos de borda documentados
- [x] Fluxos de erro documentados
- [x] Instrucoes de setup claras

## Comandos Uteis
```bash
aws eks update-kubeconfig --name oficina-mecanica-eks && kubectl get nodes,hpa -A
gh workflow run cd.yml -R guilhermeqmaia/soat-fiap-oficina-infra-k8s -f action=plan -f stage=cluster
```
