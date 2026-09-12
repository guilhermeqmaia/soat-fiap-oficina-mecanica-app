# QA Plan — US-F3-08: CI/CD por Repositorio com Deploy Automatico

## Resumo
Valida os pipelines dos 4 repos: CI (lint/test/build ou `fmt`/`validate`/`plan`) e CD (deploy automatico por branch) autenticando na AWS por **OIDC**, `plan` comentado no PR, artefatos/logs, link do deploy ativo, scans de seguranca e diagrama do fluxo. Inclui as evidencias reais do primeiro ciclo completo (12/09/2026).

## Pre-requisitos
- `gh` logado; `aws` (profile `oficina`) para conferir a role OIDC
- Secrets/vars criados pelo `scripts/aws-account-bootstrap.sh` (`AWS_ROLE_ARN`, `TF_STATE_BUCKET`, ...)

## Cenarios de Teste

### TS-01: Lambda — CI + CD (versao/alias)
- **Tipo:** Automatizado
- **Criterio:** `auth-lambda`: CI (lint/test/build) + CD (deploy, versao/alias)
- **Passos:**
  1. `gh run list -R guilhermeqmaia/soat-fiap-oficina-auth-lambda --workflow ci.yml --limit 1`; idem `cd.yml` e `infra.yml`
  2. Log do `cd.yml`: `update-function-code` -> `publish-version` -> smoke `422` -> `update-alias prod`
- **Resultado esperado:** CI verde (prettier, eslint, tsc, jest+cov, `lambda.zip`, `terraform fmt/validate`); CD publica versao N e move o alias so apos o smoke; `infra.yml` aplica o Terraform (secrets, role, VPC)

### TS-02: infra-k8s — CI `fmt`/`validate`/`plan` + CD `apply`
- **Tipo:** Automatizado
- **Criterio:** `infra-k8s`: CI no PR + CD no merge
- **Passos:**
  1. Abrir PR tocando `cluster/`; conferir jobs `fmt + validate (*)` e `plan comentado no PR (cluster|gateway)`
  2. Merge -> run `CD - Terraform apply` (stages `cluster` e depois `gateway`, `max-parallel: 1`)
- **Resultado esperado:** comentario com `Plan: N to add ...` (via OIDC); apply automatico; `workflow_dispatch` com `action` e `stage`

### TS-03: infra-db — CI + CD
- **Tipo:** Automatizado
- **Criterio:** `infra-db`: CI no PR + CD no merge
- **Passos:** analogos ao TS-02 (`ci.yml`/`cd.yml`)
- **Resultado esperado:** plan no PR; apply no merge com state em S3 + lock DynamoDB

### TS-04: App — CI (testes + gate 80% + imagem) e CD (ECR + EKS + migrations + smoke)
- **Tipo:** Automatizado
- **Criterio:** `mecanica-app`: CI + CD completo
- **Passos:**
  1. `ci-cd.yml` em PR: unit + integracao (testcontainers), cobertura >= 80%, build da imagem, deploy em kind efemero
  2. `cd-aws.yml` em `main`: build -> Trivy -> push ECR -> secrets -> kustomize -> migrations -> rollout -> smoke -> publica listener do NLB
- **Resultado esperado:** ambos verdes; step summary com a imagem e o `backend_listener_arn`

### TS-05: Deploy por branch (`homolog`/`main`)
- **Tipo:** Ambos
- **Criterio:** `homolog` -> homologacao; `main` -> producao
- **Passos:**
  1. `grep -A8 "resolve:" .github/workflows/cd-aws.yml` — mapeamento `env_name`/`tag_suffix`
  2. `git push origin homolog` (ou PR) e observar o environment do run
- **Resultado esperado:** run com environment `homolog` e tag `homolog`; `main` -> `production`/`prod`

### TS-06: Autenticacao AWS por OIDC, sem secrets estaticos
- **Tipo:** Ambos
- **Criterio:** OIDC (federacao)
- **Passos:**
  1. `gh secret list -R guilhermeqmaia/<repo>` — apenas `AWS_ROLE_ARN` (+ `TF_STATE_BUCKET`, segredos de app), sem `AWS_ACCESS_KEY_ID`
  2. Log do step "Credenciais AWS" de qualquer run: `aws sts get-caller-identity`
  3. `aws iam get-role --role-name github-actions-oficina --query 'Role.AssumeRolePolicyDocument'`
- **Resultado esperado:** `"Arn": "arn:aws:sts::<conta>:assumed-role/github-actions-oficina/gha-oficina-<repo>"`; trust restrita aos 4 repos (`sub` com e sem IDs imutaveis); `permissions: id-token: write` nos workflows

### TS-07: `plan` no PR, `apply` so apos merge
- **Tipo:** Automatizado
- **Criterio:** plan comentado no PR; apply apenas na branch protegida
- **Passos:**
  1. Nos repos de infra, `ci.yml` (pull_request) comenta o plan; `cd.yml` so em `push` de `main`/`homolog` ou dispatch manual
- **Resultado esperado:** nenhum apply em PR; comentario de plan presente

### TS-08: Artefatos, logs e bloqueio por falha
- **Tipo:** Ambos
- **Criterio:** Artefatos/logs publicados; falha bloqueia merge/rollout
- **Passos:**
  1. Step summaries (imagem, outputs do Terraform, listener); artefatos do perf (`perf-*`)
  2. Evidencia real: o Trivy bloqueou o rollout por `tar` 6.2.1 (CRITICAL) ate o fix no Dockerfile; runs vermelhos impedem merge (check obrigatorio)
- **Resultado esperado:** rastreabilidade por run; falha e bloqueante

### TS-09: Link do deploy ativo nos READMEs
- **Tipo:** Manual
- **Criterio:** Link do deploy ativo em cada README
- **Passos:**
  1. README de cada repo, secao CI/CD — "Deploy ativo"
- **Resultado esperado:** explica que o ambiente e efemero (ADR-0008) e como obter a URL (`api_base_url` / saida do `aws-deploy-all.sh`); no PDF de entrega a URL vigente

### TS-10: Scans de seguranca
- **Tipo:** Automatizado
- **Criterio:** npm audit / Trivy / Semgrep
- **Passos:**
  1. `grep -n -i "trivy\|npm audit\|semgrep" .github/workflows/*.yml` (e nos outros repos)
- **Resultado esperado:** `npm audit` e Trivy (imagem, `--severity CRITICAL --exit-code 1`) no app; `npm audit` na Lambda; `tfsec`/`validate` nos de infra

### TS-11: Diagrama do fluxo ponta a ponta
- **Tipo:** Manual
- **Criterio:** Diagrama (US-F3-DOC-03)
- **Resultado esperado:** `docs/arquitetura/` contem o fluxo PR -> CI -> merge -> CD -> AWS para os 4 repos

## Casos de Borda
- `${{ }}` literal em comentario de workflow invalida o arquivo ("workflow file issue")
- Listas HCL em `echo "..."` perdem as aspas no bash — usar aspas simples (corrigido em `infra.yml` da Lambda)
- Runner ja tem `kustomize`; o instalador recusa sobrescrever (corrigido)
- Var vazia em `TF_VAR_<lista>` quebra o parse — defaults `|| '[]'`

## Rastreabilidade

| Criterio de Aceite | Cenarios |
|---|---|
| auth-lambda CI + CD | TS-01 |
| infra-k8s CI + CD | TS-02 |
| infra-db CI + CD | TS-03 |
| mecanica-app CI + CD | TS-04 |
| Deploy por branch | TS-05 |
| OIDC sem secrets estaticos | TS-06 |
| plan no PR / apply apos merge | TS-07 |
| Artefatos/logs; falha bloqueia | TS-08 |
| Link do deploy ativo | TS-09 |
| Scans de seguranca | TS-10 |
| Diagrama | TS-11 |

## Checklist de Validacao
- [x] Todos os criterios cobertos
- [x] Casos de borda documentados
- [x] Fluxos de erro documentados
- [x] Instrucoes de setup claras

## Comandos Uteis
```bash
for r in auth-lambda infra-k8s infra-db mecanica-app; do gh run list -R guilhermeqmaia/soat-fiap-oficina-$r --limit 3; done
```
