# US-F3-06: Deploy da Aplicacao no EKS

**User Story:** Como time de plataforma, quero que a aplicacao NestJS rode no cluster EKS consumindo o RDS gerenciado, para operar em nuvem com escalabilidade e alta disponibilidade.

**Prioridade:** Alta
**Story Points:** 5
**Status:** Concluída
**DDD Domain:** Infraestrutura / Aplicacao
**DDD Layer:** Infrastructure
**Repositorio:** 4 — `soat-fiap-oficina-mecanica-app` (este repo)

## Contexto

Os manifestos Kustomize existentes (`k8s/`) precisam evoluir de kind/Postgres
in-cluster para **EKS + RDS** ([f3-04](f3-04-terraform-banco-gerenciado.md),
[f3-05](f3-05-terraform-cluster-kubernetes.md)), com a imagem publicada no **ECR**.

## Criterios de Aceite

- [x] Imagem da aplicacao publicada no **Amazon ECR** (tag por commit/versao)
- [x] Manifestos aplicam no **EKS** (namespace, deployment, service, HPA, configmap, migrations-job) — overlay `k8s-aws/`
- [x] `DATABASE_URL` vem do **Secret do RDS** — o CD sincroniza o Secrets Manager para o Secret `oficina-db` a cada deploy
- [x] Backend alcancavel pelo **API Gateway** via **NLB interno** (provider in-tree). **Desvio consciente:** ALB + AWS Load Balancer Controller exigiria IRSA/OIDC, impossivel no AWS Academy — mesmo contrato (listener de LB interno) para o VPC Link. Ver `k8s-aws/README.md`.
- [x] Job de migrations (`prisma migrate deploy`) roda antes do rollout (CD aguarda `condition=complete`)
- [x] Probes (startup/liveness/readiness) e requests/limits calibrados para o node group t3.medium
- [x] **HPA** ativo (2–10, CPU 70%/mem 80%) com `metrics-server` do cluster — validacao sob carga real depende da sessao do lab
- [x] **Escopo definido:** as SPAs ficam fora do EKS e apontam para o gateway (unico endpoint publico) — removidas do overlay
- [x] Rollout sem downtime (`maxUnavailable: 0` + PDB + spread por AZ) e rollback documentado
- [x] Smoke test pos-deploy (`/health`, `/health/ready`) no pipeline
- [x] README com passo-a-passo, rollback e placeholder do deploy ativo (`k8s-aws/README.md`)

## Notas

- Consome outputs dos repos 2 (cluster) e 3 (banco); documentar como esses valores chegam ao pipeline (ex.: SSM Parameter Store / remote state data source).
