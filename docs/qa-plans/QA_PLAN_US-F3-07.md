# QA Plan — US-F3-07: Segregacao em 4 Repositorios + Branch Protection

## Resumo
Valida a organizacao em 4 repositorios `soat-fiap-oficina-*`, a migracao da infra, a protecao de `main` (PR obrigatorio, checks, branch atualizada), a estrategia `homolog`/`main`, READMEs/Dockerfiles, `CODEOWNERS` e template de PR, o colaborador `soat-architecture` e a documentacao das dependencias entre repos.

## Pre-requisitos
- `gh` logado com acesso aos 4 repos
- Nenhum ambiente necessario (validacao de configuracao e docs)

## Cenarios de Teste

### TS-01: Os 4 repositorios existem
- **Tipo:** Ambos
- **Criterio:** 4 repos criados/organizados
- **Passos:**
  1. `gh repo list guilhermeqmaia --json name -q '.[].name' | grep soat-fiap-oficina`
- **Resultado esperado:** `auth-lambda`, `infra-k8s`, `infra-db`, `mecanica-app`

### TS-02: Infra migrada para os repos 2 e 3
- **Tipo:** Manual
- **Criterio:** Conteudo de `infra/terraform/` migrado preservando historico quando possivel
- **Passos:**
  1. `ls infra/terraform` neste repo (so o que ficou: sonar etc.)
  2. `git log --oneline -3 -- cluster/` no repo infra-k8s; `git log --oneline -3` no infra-db
- **Resultado esperado:** stages `cluster/`, `gateway/`, `observability/` no repo 2; RDS no repo 3; commits de migracao rastreaveis

### TS-03: `main` protegida — sem push direto, PR obrigatorio
- **Tipo:** Ambos
- **Criterio:** `main` protegida em todos os repos
- **Passos (para cada repo):**
  1. `gh api repos/guilhermeqmaia/<repo>/rules/branches/main | jq '[.[].type]'` (rulesets) ou `gh api repos/.../branches/main/protection`
  2. Tentar `git push origin main` sem PR com um usuario nao-admin
- **Resultado esperado:** regras `pull_request` (e `required_status_checks`) ativas; push direto rejeitado (`Changes must be made through a pull request`). Admin consegue contornar (`--admin`) — usado apenas para merge solo, registrado em ADR-0006

### TS-04: Regras de PR — aprovacao, checks verdes, branch atualizada
- **Tipo:** Manual
- **Criterio:** >= 1 aprovacao, status checks obrigatorios, branch atualizada
- **Passos:**
  1. Abrir um PR de teste; conferir os checks exigidos (`CI`) e o bloqueio do botao de merge ate ficar verde/aprovado
- **Resultado esperado:** merge bloqueado ate `CI` verde; regra de review configurada (time solo: bypass de admin documentado)

### TS-05: Estrategia de branches `homolog` -> homologacao, `main` -> producao
- **Tipo:** Ambos
- **Criterio:** Deploy automatico por branch
- **Passos:**
  1. `grep -n "branches:" -A1 .github/workflows/cd*.yml` em cada repo
  2. `gh api repos/guilhermeqmaia/<repo>/environments --jq '.environments[].name'`
- **Resultado esperado:** `on.push.branches: [main, homolog]`; job `resolve` mapeia `main -> production`, outro -> `homolog`; environment `production` existe

### TS-06: README e Dockerfile por repo
- **Tipo:** Manual
- **Criterio:** README proprio; Dockerfile quando aplicavel
- **Passos:**
  1. `gh api repos/guilhermeqmaia/<repo>/contents --jq '.[].name' | grep -E "README|Dockerfile"`
- **Resultado esperado:** README nos 4; Dockerfile no app e na Lambda (build do artefato); Terraform-only nos repos de infra

### TS-07: `CODEOWNERS` e template de PR
- **Tipo:** Manual
- **Criterio:** CODEOWNERS e template de PR configurados
- **Passos:**
  1. `gh api repos/guilhermeqmaia/<repo>/contents/.github --jq '.[].name'`
- **Resultado esperado:** `CODEOWNERS` e `pull_request_template.md` presentes (ou documentado onde ficam)

### TS-08: Colaborador `soat-architecture`
- **Tipo:** Ambos
- **Criterio:** Usuario adicionado em todos os repos
- **Passos:**
  1. `for r in auth-lambda infra-k8s infra-db mecanica-app; do gh api repos/guilhermeqmaia/soat-fiap-oficina-$r/collaborators/soat-architecture -q .permissions 2>&1 | head -1; done`
- **Resultado esperado:** permissao `pull` (ou superior) nos 4; convite aceito (ou pendente listado em `.../invitations`)

### TS-09: Dependencias e ordem de deploy documentadas
- **Tipo:** Manual
- **Criterio:** Documentar dependencias entre repos
- **Passos:**
  1. Ler `docs/plano-execucao-fase-3.md` (mapeamento), ADR-0006 e ADR-0008; README do infra-k8s (secao "Subir, pausar e derrubar")
- **Resultado esperado:** ordem `cluster -> (db, lambda) -> app -> gateway -> app` explicita, com os contratos (outputs -> GitHub Variables) e o script que os fecha

## Casos de Borda
- Merge de docs/scripts em repos de infra com o ambiente derrubado: usar `[skip ci]` para o CD nao recriar recursos
- Renomear repo quebra o `sub` do OIDC? Nao — a trust aceita a forma com IDs imutaveis do GitHub (ADR-0007)

## Rastreabilidade

| Criterio de Aceite | Cenarios |
|---|---|
| 4 repositorios | TS-01 |
| Infra migrada | TS-02 |
| `main` protegida, PR obrigatorio | TS-03 |
| Regras de PR (aprovacao, checks, atualizada) | TS-04 |
| Branches `homolog`/`main` | TS-05 |
| README e Dockerfile | TS-06 |
| CODEOWNERS e template de PR | TS-07 |
| `soat-architecture` colaborador | TS-08 |
| Dependencias documentadas | TS-09 |

## Checklist de Validacao
- [x] Todos os criterios cobertos
- [x] Casos de borda documentados
- [x] Fluxos de erro documentados
- [x] Instrucoes de setup claras

## Comandos Uteis
```bash
for r in auth-lambda infra-k8s infra-db mecanica-app; do echo "== $r"; gh api repos/guilhermeqmaia/soat-fiap-oficina-$r/rules/branches/main --jq '[.[].type]'; done
```
