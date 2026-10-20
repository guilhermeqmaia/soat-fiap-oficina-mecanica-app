# US-F4-04: Repositorios dos Servicos com CI/CD Independente (Build, Testes, Sonar, Deploy EKS)

**User Story:** Como Time, quero um repositorio por microsservico com pipeline propria (build, testes, quality gate e deploy automatizado no EKS) e `main` protegida, para que cada servico evolua e seja publicado de forma independente.

**Prioridade:** Alta
**Story Points:** 8
**Status:** Em revisão — scaffolds mergeados e CI verde nos dois repos; restam o quality gate do Sonar (US-F4-13) e a validacao do deploy real quando o cluster existir
**DDD Domain:** Transversal
**DDD Layer:** Infrastructure (CI/CD)
**Repositorio:** os-service, billing-service, execucao-service

## Contexto

Enunciado: pipeline independente por servico com build, testes, verificacao
de qualidade e deploy em Kubernetes; repositorios protegidos com checagens
automaticas. Reaproveita `cd-aws.yml`, CODEOWNERS e template de PR da Fase 3.

## Criterios de Aceite

- [x] Repos `soat-fiap-oficina-billing-service` e `soat-fiap-oficina-execucao-service` criados a partir do template do kit (PR #1 em cada, 20/10); `soat-fiap-oficina-mecanica-app` evolui para OS Service (ver [US-F4-06](f4-06-os-service-strangler.md))
- [x] Branch protection igual a Fase 3 (PR + 1 aprovacao + checks obrigatorios: CI `Lint, typecheck, testes (gate 80%) e build` e `Build da imagem`), CODEOWNERS, template de PR, `soat-architecture` colaborador — o check do **SonarCloud Quality Gate** vira obrigatorio quando o `SONAR_TOKEN` existir ([US-F4-13](f4-13-cobertura-e-sonar.md))
- [x] `ci.yml`: lint, typecheck, unit + integracao com cobertura, `sonarcloud` (bloqueante com o token — US-F4-13), build da imagem; o scan **Trivy** roda no CD antes do push no ECR (bloqueia CRITICAL), como no monolito
- [x] `cd-aws.yml`: `homolog` -> homologacao, `main` -> producao; ECR por servico (`oficina-billing-service`, `oficina-execucao-service`); kustomize overlay `k8s-aws/`; job de migrations (Postgres); rollout + smoke `/health` — ate o cluster existir (US-F4-02/03/05) o CD para apos o push no ECR, com aviso
- [x] Deploy publica no summary o Service e o **NodePort** do servico (target group do NLB unico — ADR-0013)
- [x] Secrets/vars por repo via OIDC (`AWS_ROLE_ARN`) — trust da role `github-actions-oficina` estendida aos novos repos (12 `sub`s) e `aws-account-bootstrap.sh` em sincronia; vars `AWS_REGION`, `JWT_SECRET_ID`, `ECR_REPOSITORY` definidas; `EKS_CLUSTER_NAME`, `DB_SECRET_ID`, `SNS_TOPIC_ARN`, `SQS_QUEUE_URL` chegam com as US-F4-02/03/05
- [x] README de cada repo com badges CI e CD (o badge do Sonar entra com a US-F4-13)
## Dependencias

- [US-F4-01](f4-01-kit-compartilhado.md)
