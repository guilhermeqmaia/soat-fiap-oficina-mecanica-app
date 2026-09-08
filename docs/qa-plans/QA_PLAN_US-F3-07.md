# QA Plan — US-F3-07: Segregacao em 4 Repositorios + Branch Protection

## Summary
Valida a organizacao do projeto em 4 repositorios independentes, cada um com branch `main` protegida, PR obrigatorio, estrategia de branches (`homolog`/`main`), README/Dockerfile proprios, `CODEOWNERS`, template de PR e o usuario `soat-architecture` como colaborador em todos.

## Prerequisites
- Acesso de admin (ou pelo menos leitura das configuracoes) aos 4 repositorios no GitHub
- Lista dos 4 repos: `soat-fiap-oficina-auth-lambda`, `soat-fiap-oficina-infra-k8s`, `soat-fiap-oficina-infra-db`, `soat-fiap-oficina-mecanica-app`

## Test Scenarios

### TS-01: Os 4 repositorios existem e tem o conteudo esperado
- **Type:** Manual
- **Steps:**
  1. Confirmar existencia dos 4 repositorios no GitHub/organizacao
  2. Verificar que o conteudo de `infra/terraform/01-cluster` e `02-app` (legado, no repo da app) foi migrado para `infra-k8s` e `infra-db` respectivamente (ou que a migracao esta em andamento/documentada)
- **Expected result:** 4 repositorios distintos, cada um com o escopo correto

### TS-02: Branch main protegida em todos os repos
- **Type:** Manual (GitHub Settings > Branches)
- **Acceptance criterion:** main protegida, sem push direto, PR obrigatorio
- **Steps:**
  1. Em cada um dos 4 repos, abrir Settings > Branches > Branch protection rules para `main`
  2. Tentar (ou simular) um push direto a `main` sem PR
- **Expected result:** Push direto bloqueado; regra de protecao ativa nos 4 repos

### TS-03: Regras de PR — aprovacao e status checks obrigatorios
- **Type:** Manual
- **Acceptance criterion:** pelo menos 1 aprovacao, CI obrigatorio verde, branch atualizada
- **Steps:**
  1. Abrir um PR de teste em cada repo sem aprovacao — confirmar que o botao de merge fica bloqueado
  2. Forcar falha proposital no CI (ex.: quebrar um teste) — confirmar que o merge continua bloqueado mesmo com aprovacao
  3. Aprovar e corrigir o CI — confirmar que o merge libera
- **Expected result:** Merge so libera com aprovacao + CI verde + branch atualizada (se exigido)

### TS-04: Estrategia de branches homolog/main
- **Type:** Manual
- **Steps:**
  1. Confirmar existencia da branch `homolog` nos 4 repos
  2. Verificar nos workflows (`cd.yml`/`ci-cd.yml`) que push/merge em `homolog` dispara deploy de homologacao e em `main` dispara producao
- **Expected result:** Deploy automatico correto por branch, conforme US-F3-08

### TS-05: README e Dockerfile por repositorio
- **Type:** Manual — ver detalhamento em [f3-doc-05](../user-stories/f3-doc-05-readmes-por-repo.md)
- **Steps:**
  1. Confirmar `README.md` em cada um dos 4 repos
  2. Confirmar `Dockerfile` presente onde aplicavel (auth-lambda, mecanica-app) e ausente/nao exigido nos repos 100% Terraform (infra-k8s, infra-db)
- **Expected result:** README completo por repo; Dockerfile so onde faz sentido tecnicamente

### TS-06: CODEOWNERS e template de PR
- **Type:** Manual
- **Steps:**
  1. Verificar arquivo `CODEOWNERS` em cada repo (raiz ou `.github/`)
  2. Verificar `.github/pull_request_template.md` em cada repo
  3. Abrir um PR de teste e confirmar que o template e preenchido automaticamente e que os donos corretos sao sugeridos como revisores
- **Expected result:** CODEOWNERS e template presentes e funcionais nos 4 repos — **gap conhecido no momento deste plano:** apenas `soat-fiap-oficina-auth-lambda` tem `pull_request_template.md`; nenhum repo tem `CODEOWNERS` ainda

### TS-07: Usuario soat-architecture como colaborador
- **Type:** Manual
- **Acceptance criterion:** ver tambem [f3-12](../user-stories/f3-12-entrega-video-pdf.md)
- **Steps:**
  1. Em cada um dos 4 repos, Settings > Collaborators — confirmar `soat-architecture` com acesso de leitura (no minimo)
- **Expected result:** Usuario presente nos 4 repositorios

### TS-08: Dependencias entre repos documentadas
- **Type:** Manual
- **Steps:**
  1. Verificar documentacao (README principal ou `plano-execucao-fase-3.md`) descrevendo a ordem de deploy: banco -> cluster -> app; lambda -> gateway
- **Expected result:** Ordem de deploy explicita e correta, evitando que alguem tente subir a app antes do banco/cluster

## Edge Cases
- PR aberto por um bot/automacao (ex.: dependabot) — confirmar que ainda respeita as mesmas regras de protecao
- Repositorio com apenas 1 colaborador — regra de "1 aprovacao" pode travar o fluxo do proprio autor (avaliar exceção documentada, se houver)
- Tentativa de merge via API/CLI (`gh pr merge --admin`) ignorando a UI — confirmar se a protecao tambem bloqueia esse caminho

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| 4 repositorios criados/organizados | TS-01 |
| Conteudo de infra migrado | TS-01 |
| main protegida, sem push direto, PR obrigatorio | TS-02 |
| Regras de PR (aprovacao + CI + branch atualizada) | TS-03 |
| Estrategia homolog/main | TS-04 |
| README e Dockerfile por repo | TS-05 |
| CODEOWNERS e template de PR | TS-06 |
| soat-architecture como colaborador | TS-07 |
| Dependencias entre repos documentadas | TS-08 |

## Validation Checklist
- [ ] Todos os criterios de aceite cobertos
- [ ] Edge cases documentados
- [ ] Gaps conhecidos (CODEOWNERS, PR template) registrados como pendencia, nao como "aprovado"
- [ ] Instrucoes de setup claras

## Useful Commands
```bash
# Verificar protecao de branch via GitHub CLI
gh api repos/{owner}/{repo}/branches/main/protection

# Listar colaboradores
gh api repos/{owner}/{repo}/collaborators

# Verificar CODEOWNERS/template em cada repo
find . -iname CODEOWNERS -o -iname pull_request_template.md
```

## Nota de status
No momento da escrita deste plano: `CODEOWNERS` ausente nos 4 repos; `pull_request_template.md` presente apenas em `soat-fiap-oficina-auth-lambda`. Registrar como item aberto no indice de QA Plans ([README.md](README.md)).
