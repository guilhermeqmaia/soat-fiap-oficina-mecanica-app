# US-F3-DOC-04: Justificativa do Banco + Modelo Relacional + ER

**User Story:** Como Arquiteto, quero uma justificativa formal da escolha do banco e um modelo relacional documentado com diagrama ER e explicacao dos relacionamentos, para garantir consistencia, performance e clareza do modelo de dados.

**Prioridade:** Alta
**Story Points:** 3
**Status:** Concluída
**DDD Domain:** Documentacao / Dados
**DDD Layer:** —
**Repositorio:** 4 — `docs/`

## Contexto

O enunciado exige **justificativa formal para a escolha do banco** e **ajustes no
modelo relacional, com diagramas ER e explicacao dos relacionamentos**. Ja existe
`docs/schema.dbml`; falta a justificativa e a explicacao dos relacionamentos.

## Criterios de Aceite

- [x] Documento `docs/arquitetura/banco-de-dados.md` com:
  - [x] **Justificativa formal** do PostgreSQL/RDS (ACID, tipos ricos, maturidade, HA gerenciada, compatibilidade com as migrations Prisma) x alternativas
  - [x] **Diagrama ER** (a partir do `docs/schema.dbml` / Prisma; imagem exportada para o PDF)
  - [x] **Explicacao de cada relacionamento** (cardinalidade e regra de negocio): Cliente 1-N Veiculo, Cliente 1-N OrdemDeServico, OrdemDeServico N-N Servico, OrdemDeServico N-N Produto, movimentacoes de estoque, Usuario/roles
  - [x] **Ajustes no modelo relacional** feitos na Fase 3 (indices para os dashboards de tempo por status/volume, constraints, normalizacao) com o porque
- [x] `docs/schema.dbml` atualizado se houver mudancas de modelo
- [x] Consideracoes de **performance** (indices que suportam as consultas de observabilidade em [f3-11](f3-11-dashboards-alertas.md)) e **consistencia** (transacoes, FKs)
- [x] Linkado no README principal e no indice de docs ([f3-doc-06](f3-doc-06-indice-docs-readme.md))
