# QA Plan — US-F3-05: Terraform — Cluster Kubernetes Gerenciado (EKS)

## Summary
Valida o provisionamento do cluster EKS via Terraform (`soat-fiap-oficina-infra-k8s/cluster`): VPC/subnets, managed node group escalavel, metrics-server, add-ons (AWS Load Balancer Controller/CNI/CoreDNS), IRSA, HPA funcional e integracao com o API Gateway.

## Prerequisites
- Terraform 1.9.8, `kubectl`, `aws` CLI configurados
- Credenciais AWS (Learner Lab) com permissao para EKS/VPC/IAM
- Para os testes de HPA: `kubectl top` funcionando (metrics-server) e alguma forma de gerar carga (ex.: `perf/scripts` do repo da app ou `hey`/`k6`)

## Test Scenarios

### TS-01: Terraform fmt/validate no CI
- **Type:** Automated (CI)
- **Steps:**
  1. `terraform -chdir=cluster fmt -check -diff`
  2. `terraform -chdir=cluster init -backend=false -input=false`
  3. `terraform -chdir=cluster validate`
- **Expected result:** Sucesso (mesmo gate do `ci.yml`, matrix `stage: cluster`)

### TS-02: VPC com subnets publicas/privadas multi-AZ e NAT
- **Type:** Manual/config
- **Steps:**
  1. Revisar `network.tf` — subnets publicas (com IGW) e privadas (com NAT Gateway), distribuidas em pelo menos 2 AZs
  2. `terraform plan`/console AWS — confirmar contagem de subnets e AZs
- **Expected result:** Topologia multi-AZ com NAT permitindo saida das subnets privadas

### TS-03: Cluster EKS e managed node group provisionados
- **Type:** Manual/config
- **Steps:**
  1. `terraform plan` — revisar `aws_eks_cluster` e `aws_eks_node_group`
  2. `aws eks update-kubeconfig --name <cluster>` + `kubectl get nodes`
- **Expected result:** Nodes do managed node group visiveis e `Ready`

### TS-04: Autoescalonamento de nodes (cluster autoscaler / Karpenter)
- **Type:** Manual
- **Steps:**
  1. Revisar configuracao do autoscaler/Karpenter em `cluster.tf`
  2. Forcar demanda de pods acima da capacidade atual e observar se novos nodes sobem
- **Expected result:** Node group escala dentro dos limites `min`/`max` configurados

### TS-05: metrics-server instalado (pre-requisito do HPA)
- **Type:** Automated (smoke) / Manual
- **Steps:**
  1. `kubectl get deployment metrics-server -n kube-system`
  2. `kubectl top nodes` e `kubectl top pods -n oficina`
- **Expected result:** metrics-server rodando; `kubectl top` retorna dados (nao erro "metrics not available")

### TS-06: Add-ons — AWS Load Balancer Controller, CNI, CoreDNS
- **Type:** Manual
- **Steps:**
  1. `kubectl get pods -n kube-system` — confirmar pods do CNI (`aws-node`), CoreDNS e, se aplicavel, `aws-load-balancer-controller`
- **Expected result:** Todos os add-ons `Running`

### TS-07: IRSA para pods que acessam AWS
- **Type:** Manual/config
- **Acceptance criterion:** IRSA (IAM Roles for Service Accounts)
- **Steps:**
  1. Revisar `aws_iam_openid_connect_provider` e roles associadas a service accounts (Secrets Manager, ECR, agente de observabilidade)
  2. `kubectl describe sa <service-account> -n oficina` — confirmar annotation `eks.amazonaws.com/role-arn`
  3. De dentro de um pod com essa SA, tentar acessar o recurso AWS correspondente (ex.: ler um secret)
- **Expected result:** Pod consegue autenticar na AWS sem chaves estaticas, via IRSA

### TS-08: HPA funcionando no cluster gerenciado
- **Type:** Manual (com carga)
- **Acceptance criterion:** Escalabilidade comprovada — HPA por CPU/memoria (min/max)
- **Steps:**
  1. `kubectl get hpa -n oficina`
  2. Gerar carga sustentada na aplicacao (ex.: `npm run perf:load` do repo da app, ou `perf/scripts/hpa-scale-test.sh`)
  3. Observar `kubectl get hpa -n oficina -w` durante a carga
- **Expected result:** Replicas aumentam quando CPU/memoria ultrapassam o threshold (70%/80%) e reduzem apos a carga cessar, respeitando min/max

### TS-09: Integracao com o API Gateway (ingress/ALB alcancavel)
- **Type:** Manual
- **Steps:**
  1. Confirmar que o listener/NLB interno usado pelo VPC Link do gateway ([QA_PLAN_US-F3-02](QA_PLAN_US-F3-02.md)) aponta para o Service correto do cluster
  2. Chamar uma rota via o gateway publico e confirmar resposta da aplicacao no EKS
- **Expected result:** Requisicao completa gateway -> EKS com sucesso

### TS-10: Remote state e parametrizacao por ambiente
- **Type:** Manual/config
- **Steps:**
  1. Revisar backend S3 + DynamoDB lock em `versions.tf`
  2. Revisar `terraform.tfvars.example` e diferenca homolog/prod (tamanho do node group, etc.)
- **Expected result:** State remoto com lock; parametros variam por ambiente sem duplicar codigo

### TS-11: Outputs consumidos pelo repo da aplicacao
- **Type:** Manual/config
- **Steps:**
  1. `terraform output` — nome do cluster, endpoint, dados OIDC
  2. Confirmar que o pipeline do repo da app le esses outputs (remote state data source ou SSM) para configurar `kubectl`/deploy
- **Expected result:** Outputs corretos e consumidos automaticamente pelo CD da aplicacao

### TS-12: README do repo completo
- **Type:** Manual — ver tambem [f3-doc-05](../user-stories/f3-doc-05-readmes-por-repo.md)
- **Acceptance criterion:** README do repo: recursos, como aplicar, diagrama de rede, variaveis, custo estimado
- **Steps:**
  1. Abrir o README do repo `soat-fiap-oficina-infra-k8s`
  2. Confirmar presenca de: recursos criados, como aplicar, diagrama de rede, variaveis, custo estimado
- **Expected result:** README completo, cobrindo todos os itens acima

## Edge Cases
- Node group atinge o `max_size` sob carga sustentada — HPA nao consegue mais escalar pods (validar que o alerta de CPU do US-F3-11 dispara nesse cenario)
- Falha de um node (simulada via `kubectl drain`) — pods devem ser reagendados nos nodes restantes sem downtime perceptivel (PDB configurado no repo da app)
- IRSA mal configurado (role sem trust policy correta) — pod deve falhar de forma visivel nos logs, nao silenciosamente

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| Terraform fmt/validate/plan no CI | TS-01 |
| VPC (subnets, NAT, multi-AZ) | TS-02 |
| Cluster EKS + managed node group | TS-03 |
| Escalabilidade do node group | TS-04 |
| metrics-server | TS-05 |
| Add-ons (LB Controller, CNI, CoreDNS) | TS-06 |
| IRSA | TS-07 |
| HPA funcionando | TS-08 |
| Integracao com API Gateway | TS-09 |
| Remote state + parametrizacao | TS-10 |
| Outputs consumidos pelo repo da app | TS-11 |
| README do repo | TS-12 |

## Validation Checklist
- [ ] Todos os criterios de aceite cobertos
- [ ] Edge cases documentados
- [ ] Fluxos de erro documentados
- [ ] Instrucoes de setup claras

## Useful Commands
```bash
terraform -chdir=cluster fmt -check -diff
terraform -chdir=cluster init -backend=false -input=false
terraform -chdir=cluster validate

# Com credenciais reais
terraform -chdir=cluster plan
aws eks update-kubeconfig --name <cluster-name>
kubectl get nodes
kubectl get hpa -n oficina -w
kubectl top pods -n oficina
```
