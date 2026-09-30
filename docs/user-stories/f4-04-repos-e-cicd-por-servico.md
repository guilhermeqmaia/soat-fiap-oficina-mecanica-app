# US-F4-04: Repositorios dos Servicos com CI/CD Independente (Build, Testes, Sonar, Deploy EKS)

**User Story:** Como Time, quero um repositorio por microsservico com pipeline propria (build, testes, quality gate e deploy automatizado no EKS) e `main` protegida, para que cada servico evolua e seja publicado de forma independente.

**Prioridade:** Alta
**Story Points:** 8
**Status:** To Do
**DDD Domain:** Transversal
**DDD Layer:** Infrastructure (CI/CD)
**Repositorio:** os-service, billing-service, execucao-service

## Contexto

Enunciado: pipeline independente por servico com build, testes, verificacao
de qualidade e deploy em Kubernetes; repositorios protegidos com checagens
automaticas. Reaproveita `cd-aws.yml`, CODEOWNERS e template de PR da Fase 3.

## Criterios de Aceite

- [ ] Repos `soat-fiap-oficina-billing-service` e `soat-fiap-oficina-execucao-service` criados a partir do template do kit; `soat-fiap-oficina-mecanica-app` evolui para OS Service (ver [US-F4-06](f4-06-os-service-strangler.md))
- [ ] Branch protection igual a Fase 3 (PR + 1 aprovacao + checks obrigatorios: CI, **SonarCloud Quality Gate**), CODEOWNERS, template de PR, `soat-architecture` convidado
- [ ] `ci.yml`: lint, typecheck, unit + integracao com cobertura, `sonarcloud` (quality gate bloqueante), build da imagem, Trivy
- [ ] `cd.yml`: `homolog` -> homologacao, `main` -> producao; ECR por servico; kustomize overlay `k8s-aws/`; job de migrations (Postgres) ; rollout + smoke `/health`
- [ ] Deploy publica no summary a URL interna e o listener do NLB usado pelo gateway
- [ ] Secrets/vars por repo via OIDC (`AWS_ROLE_ARN`) — trust da role `github-actions-oficina` estendido aos novos repos
- [ ] README de cada repo com badges (CI, CD, Sonar)
## Dependencias

- [US-F4-01](f4-01-kit-compartilhado.md)
