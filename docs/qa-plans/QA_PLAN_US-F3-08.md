# QA Plan — US-F3-08: CI/CD por Repositorio com Deploy Automatico

## Summary
Valida o pipeline de CI/CD de cada um dos 4 repositorios: CI (lint/test/build/`terraform plan`), CD (deploy automatico por branch), autenticacao via OIDC (sem secrets estaticos), comentario de `plan` no PR, publicacao de artefatos/logs, link do deploy ativo no README e scans de seguranca.

## Prerequisites
- Acesso de leitura aos workflows (`.github/workflows/`) dos 4 repositorios
- Permissao para abrir PRs de teste (ou observar execucoes recentes na aba Actions)

## Test Scenarios

### TS-01: auth-lambda — CI roda lint/test/build
- **Type:** Automated (CI real) / Manual
- **Steps:**
  1. Abrir um PR no `soat-fiap-oficina-auth-lambda`
  2. Observar a execucao do job `quality` (`ci.yml`): `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test:cov`
- **Expected result:** Todos os passos executam e reportam sucesso/falha corretamente (forcar uma falha proposital de lint para confirmar que bloqueia)

### TS-02: auth-lambda — CD publica versao/alias da Lambda
- **Type:** Manual
- **Steps:**
  1. Revisar `cd.yml` — build (`npm run package`) + deploy (atualizacao de function code, publicacao de versao/alias)
  2. Fazer merge em `homolog` e observar o deploy da nova versao
- **Expected result:** Nova versao publicada e alias apontando para ela

### TS-03: infra-k8s e infra-db — CI valida Terraform no PR
- **Type:** Automated (CI real)
- **Steps:**
  1. Abrir PR com uma mudanca em `.tf` em `infra-k8s` (matrix `cluster`/`gateway`/`observability`) e em `infra-db`
  2. Confirmar execucao de `fmt -check`, `init -backend=false`, `validate` (ver `ci.yml` de `infra-k8s`)
- **Expected result:** CI roda para cada stage/modulo e bloqueia o PR se `fmt`/`validate` falhar

### TS-04: infra-k8s e infra-db — CD aplica no merge
- **Type:** Manual
- **Steps:**
  1. Revisar `cd.yml` de ambos os repos — `terraform apply` disparado no merge em `homolog`/`main`
  2. Confirmar que o `apply` usa o backend remoto (state real), nao `-backend=false`
- **Expected result:** `apply` automatico apos merge, com state remoto

### TS-05: mecanica-app — CI com gate de cobertura e build de imagem
- **Type:** Automated (CI real)
- **Steps:**
  1. Abrir PR no `soat-fiap-oficina-mecanica-app`
  2. Observar `ci-cd.yml`: job "1️⃣ Execução dos Testes Automatizados" (unit + integration, gate de 80%), "2️⃣ Build da Aplicação", "3️⃣ Build da Imagem Docker"
  3. Forcar uma queda de cobertura abaixo de 80% — confirmar que o pipeline falha
- **Expected result:** Pipeline bloqueia PR com cobertura abaixo do gate ou testes quebrados

### TS-06: mecanica-app — CD publica no ECR e faz deploy no EKS
- **Type:** Manual
- **Steps:**
  1. Revisar `cd-aws.yml` e o job "4️⃣ Provisionamento (Terraform) + Deploy (k8s)" do `ci-cd.yml`
  2. Confirmar push da imagem para o ECR, `kubectl apply` no EKS, execucao do Job de migrations e smoke test (`/health`)
- **Expected result:** Deploy completo ponta-a-ponta apos merge na branch correta

### TS-07: Deploy automatico por branch (homolog vs. main)
- **Type:** Manual
- **Steps:**
  1. Em cada um dos 4 repos, confirmar nos workflows os filtros `branches: [homolog]` -> ambiente de homologacao e `[main]` -> producao
  2. Fazer merge de teste em `homolog` e confirmar que o ambiente de producao NAO e afetado
- **Expected result:** Isolamento correto entre ambientes por branch

### TS-08: Autenticacao AWS via OIDC (sem secrets estaticos)
- **Type:** Manual
- **Acceptance criterion:** Sem secrets estaticos de longa duracao
- **Steps:**
  1. Revisar `permissions: id-token: write` nos workflows e o step de `aws-actions/configure-aws-credentials` com `role-to-assume`
  2. Verificar em Settings > Secrets de cada repo que nao existem `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` de longa duracao usados pelo deploy
- **Expected result:** Todos os deploys autenticam via OIDC -> IAM Role, sem chaves estaticas

### TS-09: Plan do Terraform comentado no PR
- **Type:** Manual
- **Steps:**
  1. Abrir PR com mudanca de infra em `infra-k8s`/`infra-db`
  2. Confirmar comentario automatico no PR com a saida do `terraform plan`
- **Expected result:** Comentario presente e legivel antes do merge

### TS-10: Falha bloqueia merge/rollout; artefatos e logs publicados
- **Type:** Manual
- **Steps:**
  1. Forcar uma falha em cada tipo de pipeline (lint, teste, terraform validate, build de imagem)
  2. Confirmar bloqueio do merge (branch protegida + status check) e disponibilidade dos logs na aba Actions
- **Expected result:** Nenhuma falha passa despercebida; logs acessiveis para diagnostico

### TS-11: Link do deploy ativo no README
- **Type:** Manual — ver [f3-doc-05](../user-stories/f3-doc-05-readmes-por-repo.md)
- **Steps:**
  1. Conferir que o README de cada repo tem (ou tem placeholder claro para) o link do ambiente/deploy ativo
- **Expected result:** Link presente e atualizado (ou TODO explicito, nunca informacao desatualizada silenciosa)

### TS-12: Scans de seguranca no pipeline
- **Type:** Manual
- **Acceptance criterion:** npm audit / Trivy / Semgrep
- **Steps:**
  1. Revisar os workflows em busca de steps de `npm audit`, Trivy (imagem Docker) ou Semgrep (SAST)
  2. Introduzir uma dependencia com vulnerabilidade conhecida (ambiente de teste) e confirmar que o scan acusa
- **Expected result:** Scan de seguranca presente e funcional em pelo menos o repo da aplicacao (reaproveitado da Fase 2)

### TS-13: Fluxo ponta-a-ponta documentado em diagrama
- **Type:** Manual
- **Acceptance criterion:** Documentar o fluxo ponta-a-ponta em diagrama ([f3-doc-03](../user-stories/f3-doc-03-arquitetura-diagramas.md))
- **Steps:**
  1. Abrir o diagrama de arquitetura ([f3-doc-03](../user-stories/f3-doc-03-arquitetura-diagramas.md))
  2. Confirmar que o diagrama cobre o fluxo ponta-a-ponta de CI/CD (PR -> CI -> merge -> CD -> deploy)
- **Expected result:** Diagrama presente e condizente com o pipeline real dos 4 repos

## Edge Cases
- PR que so mexe em documentacao (`.md`) — pipeline de infra/app nao deveria rodar `apply`/deploy desnecessariamente (otimizacao, nao bloqueante)
- Dois PRs mergeados quase simultaneamente em `infra-k8s`/`infra-db` — lock do state (DynamoDB) deve serializar os `apply`s
- Rollback de deploy da aplicacao — confirmar que existe um caminho manual/documentado caso o CD nao tenha rollback automatico

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| auth-lambda CI + CD | TS-01, TS-02 |
| infra-k8s CI (fmt/validate/plan) + CD (apply) | TS-03, TS-04 |
| infra-db CI (fmt/validate/plan) + CD (apply) | TS-03, TS-04 |
| mecanica-app CI (testes + gate 80% + build) + CD (ECR + EKS + migrations + smoke) | TS-05, TS-06 |
| Deploy automatico por branch | TS-07 |
| Autenticacao AWS via OIDC | TS-08 |
| Plan comentado no PR | TS-09 |
| Falha bloqueia merge/rollout; logs publicados | TS-10 |
| Link do deploy ativo no README | TS-11 |
| Scans de seguranca | TS-12 |
| Documentar fluxo ponta-a-ponta em diagrama | TS-13 |

## Validation Checklist
- [ ] Todos os criterios de aceite cobertos
- [ ] Edge cases documentados
- [ ] Fluxos de erro documentados
- [ ] Instrucoes de setup claras

## Useful Commands
```bash
# Ver execucoes recentes de workflow (GitHub CLI)
gh run list --repo {owner}/soat-fiap-oficina-auth-lambda
gh run list --repo {owner}/soat-fiap-oficina-infra-k8s
gh run list --repo {owner}/soat-fiap-oficina-infra-db
gh run list --repo {owner}/soat-fiap-oficina-mecanica-app

# Ver detalhes/logs de uma execucao
gh run view <run-id> --log
```
