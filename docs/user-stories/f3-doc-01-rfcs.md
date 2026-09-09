# US-F3-DOC-01: RFCs (Request for Comments)

**User Story:** Como Arquiteto, quero registrar as decisoes tecnicas relevantes como RFCs, para documentar contexto, alternativas e trade-offs antes de implementar a infraestrutura da Fase 3.

**Prioridade:** Alta
**Story Points:** 3
**Status:** Concluída
**DDD Domain:** Documentacao
**DDD Layer:** —
**Repositorio:** 4 — `docs/`

## Contexto

O enunciado exige **RFCs para decisoes tecnicas relevantes** (exemplos: escolha
da nuvem, do banco e da estrategia de autenticacao). As RFCs precedem o codigo de
infra (Onda 0 do [plano](../plano-execucao-fase-3.md)).

## Criterios de Aceite

- [x] Diretorio `docs/arquitetura/rfcs/` criado com um template padrao (contexto, opcoes, decisao, consequencias, status)
- [x] Indice das RFCs (`docs/arquitetura/rfcs/README.md`)
- [x] **RFC — Escolha da nuvem**: AWS x GCP x Azure x local; criterios (acesso de estudante, EKS/RDS pre-existente, custo), decisao = **AWS**
- [x] **RFC — Escolha do banco**: PostgreSQL gerenciado (RDS) x outros; compatibilidade com migrations Prisma, ACID, HA; decisao = **RDS PostgreSQL** (referencia [f3-doc-04](f3-doc-04-justificativa-banco-er.md))
- [x] **RFC — Estrategia de autenticacao**: Lambda CPF como unico emissor de JWT; API Gateway (AWS API Gateway x Kong x Traefik); **como o staff autentica** (questao em aberto do plano); expiracao/claims do token
- [x] Cada RFC com status (`Proposta`/`Aceita`/`Substituida`) e data
- [x] RFCs linkadas no README principal e no indice de docs ([f3-doc-06](f3-doc-06-indice-docs-readme.md))

## Notas

- RFC descreve o *processo de decisao* (com alternativas); ADR ([f3-doc-02](f3-doc-02-adrs.md)) registra a *decisao permanente* resultante. Evitar duplicar — linkar.
