# US-F3-DOC-06: Indice de Documentacao + Revisao do README Principal

**User Story:** Como Avaliador/Novo desenvolvedor, quero um README principal que sirva de hub central e um indice de toda a documentacao, para navegar a solucao Fase 3 sem me perder entre dezenas de arquivos markdown.

**Prioridade:** Media
**Story Points:** 3
**Status:** In Progress
**DDD Domain:** Documentacao
**DDD Layer:** —
**Repositorio:** 4 — `README.md` + `docs/`

## Contexto

Pedido explicito: **maximizar a informacao no README.md** e ter **dados mais
especificos em outros markdowns**. Hoje o README so cobre a Fase 2, ha ~30 user
stories sem indice e a documentacao esta espalhada em `docs/` sem um sumario.

## Criterios de Aceite

README principal:

- [ ] Nova secao **"Fase 3 — Nuvem, Seguranca e Observabilidade"** (objetivos, o que mudou vs Fase 2)
- [ ] **Links para os 4 repositorios** com uma linha de proposito cada
- [ ] Diagrama da arquitetura de nuvem inline (de [f3-doc-03](f3-doc-03-arquitetura-diagramas.md))
- [ ] Fluxo de **autenticacao por CPF** documentado (novo `/auth` via gateway; remocao do `/auth/login`)
- [ ] **Links dos dashboards** de observabilidade e do vídeo
- [ ] Substituir o bloco "TODO (entrega)" do video pelo link final
- [ ] Tabela de entregaveis da Fase 3 (como a da Fase 2)
- [ ] README revisado para nao contradizer a Fase 3 (ex.: instrucoes de login e Postgres in-cluster marcadas como Fase 2/legado)

Indice de documentacao:

- [x] `docs/README.md` (indice/sumario) com secoes: Arquitetura (RFCs, ADRs, diagramas, banco), User Stories (Fases 1/2/3), QA Plans, Seguranca/Scans, Curls, Storytelling
- [x] `docs/user-stories/README.md` (indice das historias por fase/sprint, com status)
- [x] Links relativos corretos e navegaveis a partir do README principal
- [x] Verificacao de links quebrados

## Notas

- Objetivo: README = "porta de entrada" com o essencial; markdowns especificos = profundidade. Evitar duplicar conteudo — o README linka, os docs detalham.
