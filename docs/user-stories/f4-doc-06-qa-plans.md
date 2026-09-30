# US-F4-DOC-06: QA Plans da Fase 4

**User Story:** Como QA do time, quero um QA Plan por historia da Fase 4 mais um plano de integracao do fluxo distribuido, para que cada criterio de aceite tenha um cenario de teste rastreavel.

**Prioridade:** Media
**Story Points:** 5
**Status:** To Do
**DDD Domain:** Todos
**DDD Layer:** Documentacao (`docs/qa-plans/`)
**Repositorio:** 4 — hub de documentacao

## Contexto

Regra do projeto (CLAUDE.md): toda historia tem `QA_PLAN`. Na Fase 4 o plano de
integracao cobre a saga ponta a ponta, incluindo falhas injetadas.

## Criterios de Aceite

- [ ] `QA_PLAN_US-F4-XX.md` para cada historia implementada (skill `/qa-plan`)
- [ ] `QA_PLAN_INTEGRACAO-F4.md`: caminho feliz, cada compensacao, timeout, reentrega de mensagem (idempotencia), DLQ, servico fora do ar durante a saga
- [ ] Tabela de rastreabilidade criterio -> cenario em todos
- [ ] Cenarios com os cartoes de teste do Mercado Pago (aprovado, recusado, pendente)
