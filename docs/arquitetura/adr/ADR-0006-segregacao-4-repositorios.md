# ADR-0006: Segregação em 4 repositórios e estratégia de branches/deploy

**Status:** Aceita
**Data:** 2026-08-24

## Contexto

O enunciado exige a segregação em **4 repositórios** (Lambda, infra K8s,
infra banco, aplicação), cada um com CI/CD, deploy automático e `main`
protegida (sem commit direto, PR obrigatório).

## Decisão

Padrão de nomes **`soat-fiap-*`**, repositórios públicos (branch protection
no plano free do GitHub):

| # | Repositório | Conteúdo | Deploy |
|---|---|---|---|
| 1 | `soat-fiap-oficina-auth-lambda` | Function de auth por CPF | AWS Lambda |
| 2 | `soat-fiap-oficina-infra-k8s` | Terraform: API Gateway + EKS | AWS |
| 3 | `soat-fiap-oficina-infra-db` | Terraform: RDS PostgreSQL | AWS |
| 4 | `soat-fiap-oficina-mecanica-app` | App NestJS + manifestos K8s + docs | EKS |

Regras (todos os repos):

- `main` protegida: PR obrigatório (1 aprovação), sem force-push/deleção;
  `enforce_admins` desligado para permitir merge solo (`gh pr merge --admin`).
- **CI em todo PR** (testes/lint no código; `fmt`/`validate`/`plan` no
  Terraform) e **CD no merge à `main`** (deploy automático; `apply` na infra).
- Credenciais **somente** via GitHub Actions Secrets (`AWS_ACCESS_KEY_ID`,
  `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` — renovado por sessão do
  Academy); segredos de runtime no AWS Secrets Manager.
- Cada repo carrega a própria documentação de contexto (`CLAUDE.md`, README,
  user stories relevantes, enunciado) — sessões de trabalho são autônomas
  por repo.
- Usuário `soat-architecture` adicionado a todos os repos na entrega
  (US-F3-12).

## Consequências

- Pipelines menores e independentes; um deploy de infra não passa pelo CI da
  aplicação (US-F3-08 implementa os 4 workflows).
- Contratos entre repos viajam por outputs/Secrets (ex.: listener ARN do ALB
  interno → variável do gateway; `DATABASE_URL` → app e Lambda) e devem estar
  documentados nos READMEs.
- O histórico da Fase 1–2 permanece no repo 4 (renomeado de
  `software-architecture-tech-challenge`); o GitHub redireciona as URLs
  antigas.
