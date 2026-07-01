# US-F2-05: Manifestos Kubernetes para Deploy da Aplicacao

**User Story:** Como DevOps, quero manifestos Kubernetes versionados no repositorio, para fazer deploy reproduzivel da aplicacao em qualquer cluster (local kind, EKS, GKE) com `kubectl apply -k`.

**Prioridade:** Alta
**Story Points:** 5
**Status:** To Do
**DDD Domain:** Infraestrutura
**DDD Layer:** Infrastructure

## Contexto

Os manifestos cobrem **apenas a aplicacao** (deployment, service, HPA, secrets, configmaps). O cluster e o banco de dados sao provisionados via Terraform (ver [US-F2-06](f2-06-terraform-iac.md)) — o PDF da Fase 2 exige IaC para cluster + DB. A app consome o DB via Service DNS (kind) ou endpoint RDS (cloud), injetado via Secret.

**Contrato de Secrets (single-writer-per-Secret).** Para evitar que Terraform e Kustomize disputem o mesmo objeto, os secrets sao divididos por dono:

- **`oficina-db`** — criado e gerenciado pelo **Terraform** (US-F2-06). Contem `DATABASE_URL` (alem de `DB_HOST/PORT/NAME/USER/PASSWORD`). A app e o Job de migrations consomem via `secretKeyRef{ name: oficina-db, key: DATABASE_URL }`. **Nao** entra no `secret.yaml.example` desta story.
- **`oficina-app`** — gerenciado por um manifesto local baseado em `secret.yaml.example` (esta story), aplicado antes do Kustomize. Contem os segredos da aplicacao: `JWT_SECRET`, `WEBHOOK_APPROVAL_TOKEN`, `NOTIFICATION_WEBHOOK_SECRET`.

## Criterios de Aceite

- [ ] Diretorio `k8s/` criado na raiz
- [ ] `namespace.yaml` — namespace dedicado (ex: `oficina`)
- [ ] `configmap.yaml` — variaveis nao-sensiveis (`PORT`, `NODE_ENV`, `NOTIFICATION_PROVIDER`)
- [ ] `secret.yaml.example` — template do Secret **`oficina-app`** com `JWT_SECRET`, `WEBHOOK_APPROVAL_TOKEN`, `NOTIFICATION_WEBHOOK_SECRET` (com nota de NAO commitar `secret.yaml` real). **`DATABASE_URL` NAO entra aqui** — vem do Secret `oficina-db` gerado pelo Terraform (US-F2-06)
- [ ] `app/deployment.yaml` com 2 replicas iniciais, `livenessProbe`, `readinessProbe`, `resources.requests/limits`
- [ ] `app/service.yaml` (ClusterIP)
- [ ] `app/hpa.yaml` — HPA por CPU 70% (min=2, max=10) e por memoria
- [ ] `migrations-job.yaml` — Job que executa `prisma migrate deploy` antes do app subir (depende do DB ja existir, provisionado pelo Terraform)
- [ ] `kustomization.yaml` na raiz de `k8s/` agregando os recursos versionados, sem depender do `secret.yaml` real ignorado pelo Git
- [ ] App lê `DATABASE_URL` do Secret `oficina-db` (gerado pelo Terraform, sem hardcode) — funciona com Postgres dentro do cluster (kind) ou RDS externo
- [ ] Validado em `kind` local: apos Terraform provisionar cluster + DB e aplicar `k8s/secret.yaml`, `./k8s/deploy.sh` sobe a app
- [ ] Validado HPA: gerar carga e ver `kubectl get hpa` escalando
- [ ] README seccao "Deploy em Kubernetes" com comandos passo a passo (na ordem: infraestrutura → Secret da app → deploy Kustomize com Job de migrations recriado)
