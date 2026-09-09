# US-F3-07: Segregacao em 4 Repositorios + Branch Protection

**User Story:** Como Gestor, quero o projeto organizado em quatro repositorios separados com regras de protecao de branch, para ter dominios de deploy independentes, revisao obrigatoria por PR e historico limpo.

**Prioridade:** Alta
**Story Points:** 5
**Status:** To Do
**DDD Domain:** Infraestrutura / Processo
**DDD Layer:** —
**Repositorio:** todos

## Contexto

O enunciado exige **quatro repositorios separados**, cada um com CI/CD e deploy
automatico. Ver o mapeamento em
[plano-execucao-fase-3.md](../plano-execucao-fase-3.md#mapeamento-dos-4-repositorios).

## Criterios de Aceite

- [ ] Criados/organizados os 4 repositorios:
  1. `soat-fiap-oficina-auth-lambda` (Function Serverless)
  2. `soat-fiap-oficina-infra-k8s` (Terraform do cluster EKS)
  3. `soat-fiap-oficina-infra-db` (Terraform do banco RDS)
  4. `soat-fiap-oficina-mecanica-app` (aplicacao — este repo)
- [ ] Conteudo de infra migrado de `infra/terraform/` (01-cluster/02-app) para os repos 2 e 3, preservando historico quando possivel
- [ ] **`main` protegida** em todos os repos: sem push direto, **PR obrigatorio** para merge
- [ ] Regras de PR: pelo menos 1 aprovacao, status checks (CI) obrigatorios verdes, branch atualizada
- [ ] Estrategia de branches: **`homolog`** (deploy automatico p/ homologacao) e **`main`** (deploy automatico p/ producao)
- [ ] Cada repo com **README** proprio ([f3-doc-05](f3-doc-05-readmes-por-repo.md)) e **Dockerfile** quando aplicavel
- [ ] `CODEOWNERS` e template de PR configurados
- [ ] Usuario **`soat-architecture`** adicionado como colaborador em **todos** os repos ([f3-12](f3-12-entrega-video-pdf.md))
- [ ] Documentar dependencias entre repos (ordem de deploy: db -> cluster -> app; lambda -> gateway)

## Notas

- Avaliar manter as UIs (`web/`) no repo da aplicacao ou extrair — decisao registrada no plano.
