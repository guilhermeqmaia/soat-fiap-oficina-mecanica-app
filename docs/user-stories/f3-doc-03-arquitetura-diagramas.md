# US-F3-DOC-03: Diagrama de Componentes + Diagramas de Sequencia (Fase 3)

**User Story:** Como Avaliador/Novo desenvolvedor, quero diagramas de componentes e de sequencia da arquitetura de nuvem da Fase 3, para entender a solucao ponta-a-ponta sem ler todo o codigo.

**Prioridade:** Alta
**Story Points:** 3
**Status:** Concluída
**DDD Domain:** Documentacao
**DDD Layer:** —
**Repositorio:** 4 — `docs/arquitetura/`

## Contexto

O enunciado exige **Diagrama de Componentes** (visao de nuvem, APIs, banco,
monitoramento) e **Diagramas de Sequencia** (autenticacao + abertura de OS).
Evoluir o `arquitetura-fase2.md` para um `arquitetura-fase3.md`.

## Criterios de Aceite

- [x] `docs/arquitetura/arquitetura-fase3.md` criado (Mermaid, renderizavel no GitHub) + export de imagem para o PDF
- [x] **Diagrama de Componentes (visao de nuvem)**: cliente/UIs, **API Gateway**, **Lambda (CPF)**, **EKS** (app, HPA, ingress/ALB), **RDS**, **observabilidade** (agente/coletor + dashboards), Secrets Manager, ECR
- [x] **Diagrama de Sequencia — Autenticacao**: cliente -> API Gateway -> Lambda (valida CPF + status) -> JWT -> API protegida
- [x] **Diagrama de Sequencia — Abertura de OS**: cliente/atendente autenticado -> API Gateway -> app (EKS) -> RDS -> evento -> notificacao
- [x] Diagrama do **fluxo de deploy** (CI/CD por repo -> AWS) atualizado da Fase 2 para a topologia dos 4 repos
- [x] Legenda/racional linkando cada componente as RFCs/ADRs ([f3-doc-01](f3-doc-01-rfcs.md), [f3-doc-02](f3-doc-02-adrs.md))
- [x] Diagramas referenciados no README principal e no indice de docs
