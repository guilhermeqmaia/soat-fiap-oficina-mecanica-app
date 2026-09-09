# US-F3-08: CI/CD por Repositorio com Deploy Automatico

**User Story:** Como time de plataforma, quero um pipeline de CI/CD em cada repositorio com deploy automatico para a nuvem, para entregar mudancas com seguranca e rastreabilidade a partir de PRs na branch protegida.

**Prioridade:** Alta
**Story Points:** 8
**Status:** To Do
**DDD Domain:** Infraestrutura / Processo
**DDD Layer:** —
**Repositorio:** todos

## Contexto

Cada um dos 4 repos ([f3-07](f3-07-segregacao-repositorios.md)) precisa de CI/CD
proprio com **deploy automatico** para AWS. Autenticacao dos pipelines na AWS via
**OIDC (GitHub Actions -> IAM Role)**, sem chaves de longa duracao.

## Criterios de Aceite

- [ ] **`soat-fiap-oficina-auth-lambda`** — CI (lint/test/build) + CD (deploy da Lambda; publicar versao/alias)
- [ ] **`soat-fiap-oficina-infra-k8s`** — CI (`fmt`/`validate`/`plan` no PR) + CD (`apply` no merge)
- [ ] **`soat-fiap-oficina-infra-db`** — CI (`fmt`/`validate`/`plan` no PR) + CD (`apply` no merge)
- [ ] **`soat-fiap-oficina-mecanica-app`** — CI (test unit/integracao + gate 80% + build imagem) + CD (push ECR + `kubectl apply` no EKS + migrations + smoke test)
- [ ] Deploy automatico por branch: `homolog` -> ambiente de homologacao; `main` -> producao
- [ ] Autenticacao AWS via **OIDC** (federacao), sem secrets estaticos
- [ ] `plan` do Terraform comentado no PR; `apply` apenas apos merge na branch protegida
- [ ] Artefatos e logs de deploy publicados; falha bloqueia o merge/rollout
- [ ] **Link do deploy ativo** exposto no README de cada repo
- [ ] Scans de seguranca no pipeline (npm audit / Trivy / Semgrep, reaproveitando a base da Fase 2)
- [ ] Documentar o fluxo ponta-a-ponta em diagrama ([f3-doc-03](f3-doc-03-arquitetura-diagramas.md))

## Notas

- Reaproveitar `ci-cd.yml` e `perf-*.yml` da Fase 2 como base para o pipeline da aplicacao.
