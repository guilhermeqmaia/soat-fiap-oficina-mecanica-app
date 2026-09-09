# QA Plan — US-F3-06: Deploy da Aplicacao no EKS

## Summary
Valida o deploy da aplicacao NestJS no EKS consumindo o RDS gerenciado: imagem no ECR, manifestos do overlay `k8s-aws/`, Secret do RDS sincronizado, alcance via NLB interno + VPC Link, Job de migrations antes do rollout, probes/HPA calibrados, rollout sem downtime e smoke test pos-deploy. Story marcada como concluida no board — este plano valida o que foi entregue, incluindo os desvios conscientes documentados.

## Prerequisites
- Cluster EKS no ar ([QA_PLAN_US-F3-05](QA_PLAN_US-F3-05.md)) e RDS provisionado ([QA_PLAN_US-F3-04](QA_PLAN_US-F3-04.md))
- `kubectl` configurado para o cluster; acesso ao ECR
- Pipeline de CD do repo da app configurado (OIDC AWS) — ver [QA_PLAN_US-F3-08](QA_PLAN_US-F3-08.md)

## Test Scenarios

### TS-01: Imagem publicada no ECR com tag por commit
- **Type:** Automated (CI/CD) / Manual
- **Steps:**
  1. Apos merge, verificar no ECR a nova tag (commit SHA ou versao)
  2. `docker pull` a imagem publicada e confirmar que builda/roda localmente
- **Expected result:** Imagem publicada e correspondente ao commit deployado

### TS-02: Manifestos aplicam no EKS via overlay k8s-aws/
- **Type:** Manual / Automated (CD)
- **Steps:**
  1. `kubectl kustomize k8s-aws/` (dry-run de build) sem erros
  2. `kubectl apply -k k8s-aws/` (ou validar que o CD fez isso)
  3. `kubectl get deployment,svc,hpa,configmap -n oficina`
- **Expected result:** Todos os recursos (deployment, service, HPA, configmap, migrations-job) presentes e saudaveis

### TS-03: DATABASE_URL vem do Secret sincronizado do RDS
- **Type:** Manual
- **Steps:**
  1. `kubectl get secret oficina-db -n oficina -o jsonpath='{.data.DATABASE_URL}' | base64 -d` (ambiente de teste apenas)
  2. Comparar com o endpoint do RDS provisionado ([QA_PLAN_US-F3-04](QA_PLAN_US-F3-04.md))
  3. Forcar um novo deploy e confirmar que o Secret e re-sincronizado do Secrets Manager
- **Expected result:** Secret sempre reflete o endpoint/credenciais atuais do RDS

### TS-04: Backend alcancavel via NLB interno + VPC Link
- **Type:** Manual
- **Acceptance criterion:** Desvio consciente documentado (NLB in-tree em vez de ALB, por limitacao do AWS Academy)
- **Steps:**
  1. Revisar `k8s-aws/patch-service-nlb.yaml` e `k8s-aws/README.md` para entender o desvio
  2. Confirmar que o listener do NLB interno bate com o `backend_listener_arn` usado pelo VPC Link do gateway ([QA_PLAN_US-F3-02](QA_PLAN_US-F3-02.md))
  3. Chamar uma rota via o gateway publico ponta-a-ponta
- **Expected result:** Requisicao completa com sucesso; desvio nao compromete o contrato de listener esperado pelo gateway

### TS-05: Job de migrations roda antes do rollout
- **Type:** Automated (CD) / Manual
- **Steps:**
  1. Disparar um deploy e observar a ordem de execucao (`kubectl get jobs -n oficina -w`)
  2. Confirmar que o CD aguarda `condition=complete` do Job antes de atualizar o Deployment
  3. Forcar uma migration falha (schema invalido) e confirmar que o rollout e bloqueado
- **Expected result:** Rollout so avanca com o Job `Complete`; falha no Job impede deploy de app quebrada

### TS-06: Probes e requests/limits calibrados
- **Type:** Manual
- **Steps:**
  1. `kubectl describe pod <pod> -n oficina` — conferir `startupProbe`/`livenessProbe`/`readinessProbe` e `resources.requests/limits`
  2. Confirmar que os valores sao compativeis com o node group `t3.medium` (sem over-commit que impeça scheduling)
- **Expected result:** Probes configuradas e pods `Ready`; sem `OOMKilled` recorrente

### TS-07: HPA ativo (2-10, CPU 70%/mem 80%)
- **Type:** Manual (com carga) — ver tambem [QA_PLAN_US-F3-05](QA_PLAN_US-F3-05.md) TS-08
- **Steps:**
  1. `kubectl get hpa -n oficina`
  2. Gerar carga e observar escalonamento
- **Expected result:** `MINPODS=2`, `MAXPODS=10`, escalonamento reage aos thresholds — nota: validacao sob carga real depende de sessao ativa do Learner Lab (limitacao documentada)

### TS-08: SPAs fora do EKS, apontando para o gateway
- **Type:** Manual
- **Steps:**
  1. Confirmar que `web/admin` e `web/cliente` nao tem manifesto no overlay `k8s-aws/`
  2. Confirmar que as SPAs (onde estiverem hospedadas) apontam para a URL publica do gateway, nao para um endpoint interno do cluster
- **Expected result:** Unico endpoint publico e o API Gateway

### TS-09: Rollout sem downtime e rollback documentado
- **Type:** Manual
- **Steps:**
  1. Disparar um novo deploy enquanto se faz polling continuo em `/health`
  2. Confirmar `maxUnavailable: 0`, PodDisruptionBudget (`pdb.yaml`) e spread por AZ (`topologySpreadConstraints`)
  3. Seguir o passo-a-passo de rollback do `k8s-aws/README.md` (`kubectl rollout undo`) e validar que a app volta a versao anterior
- **Expected result:** Nenhuma requisicao falha durante o deploy; rollback funcional e documentado

### TS-10: Smoke test pos-deploy no pipeline
- **Type:** Automated (CD)
- **Steps:**
  1. Revisar o step de smoke test do `cd-aws.yml`/`ci-cd.yml` (`/health`, `/health/ready`)
  2. Simular falha (ex.: apontar temporariamente para uma imagem quebrada) e confirmar que o smoke test falha e bloqueia/alerta
- **Expected result:** Pipeline detecta app nao saudavel logo apos o deploy

### TS-11: README com passo-a-passo, rollback e placeholder do deploy ativo
- **Type:** Manual
- **Acceptance criterion:** README com passo-a-passo, rollback e placeholder do deploy ativo (`k8s-aws/README.md`)
- **Steps:**
  1. Abrir `k8s-aws/README.md`
  2. Confirmar passo-a-passo de deploy, secao de rollback e placeholder/link do deploy ativo
- **Expected result:** README completo, cobrindo passo-a-passo, rollback e link/placeholder do deploy ativo

## Edge Cases
- RDS temporariamente indisponivel durante o deploy — `/health/ready` deve refletir "not ready" sem derrubar o pod em crash loop imediato
- Deploy com imagem invalida (tag inexistente no ECR) — rollout deve falhar de forma visivel, sem remover os pods saudaveis anteriores
- HPA no maximo (10 replicas) e carga continua aumentando — comportamento deve ser degradacao controlada, nao falha total (ver alerta de CPU do US-F3-11)

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| Imagem no ECR | TS-01 |
| Manifestos aplicam no EKS (overlay k8s-aws/) | TS-02 |
| DATABASE_URL via Secret do RDS | TS-03 |
| Alcancavel pelo API Gateway via NLB interno | TS-04 |
| Job de migrations antes do rollout | TS-05 |
| Probes e requests/limits calibrados | TS-06 |
| HPA ativo (2-10, CPU 70%/mem 80%) | TS-07 |
| SPAs fora do EKS | TS-08 |
| Rollout sem downtime + rollback | TS-09 |
| Smoke test pos-deploy | TS-10 |
| README com passo-a-passo, rollback e placeholder do deploy ativo | TS-11 |

## Validation Checklist
- [ ] Todos os criterios de aceite cobertos (inclusive os já marcados como concluídos no board)
- [ ] Edge cases documentados
- [ ] Fluxos de erro documentados
- [ ] Instrucoes de setup claras
- [ ] Desvios conscientes (NLB em vez de ALB) revalidados a cada mudanca de ambiente

## Useful Commands
```bash
kubectl apply -k k8s-aws/
kubectl get deployment,svc,hpa,configmap,job -n oficina
kubectl get pods -n oficina -w
kubectl rollout status deployment/oficina-app -n oficina
kubectl rollout undo deployment/oficina-app -n oficina
curl {gateway_url}/health
curl {gateway_url}/health/ready
```
