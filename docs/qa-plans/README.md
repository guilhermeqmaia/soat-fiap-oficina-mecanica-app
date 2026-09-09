# QA Plans — Índice

Planos de teste por User Story (formato `QA_PLAN_US-XX.md`). Cada plano cobre
pré-requisitos, cenários de teste por critério de aceite, casos de borda e
tabela de rastreabilidade. Regras de criação: ver seção "QA Plan" em
[`CLAUDE.md`](../../CLAUDE.md).

| QA Plan | US coberta | Resumo |
|---|---|---|
| [QA_PLAN_US-00](QA_PLAN_US-00.md) | [US-00 — Setup Prisma + PostgreSQL](../user-stories/00-setup-prisma-postgres.md) | Configuração do Prisma com PostgreSQL, `PrismaService` global, infraestrutura Docker e execução automática de migrations |
| [QA_PLAN_US-04](QA_PLAN_US-04.md) | [US-04 — Catálogo de Serviços](../user-stories/04-catalogo-servicos.md) | CRUD completo de serviços, validações de domínio, paginação, filtros, prevenção de nomes duplicados e Swagger |
| [QA_PLAN_US-05](QA_PLAN_US-05.md) | [US-05 — Catálogo de Produtos](../user-stories/05-catalogo-produtos.md) | CRUD de produtos com controle de estoque (disponível vs reservado), alerta de estoque baixo, paginação e filtros |
| [QA_PLAN_US-14](QA_PLAN_US-14.md) | [US-14 — Execução dos Serviços](../user-stories/14-execucao-servico.md) | Validação manual (cURL + `jq`) do fluxo de execução de serviços da OS via Docker |
| [QA_PLAN_US-18](QA_PLAN_US-18.md) | [US-18 — Controle de Estoque](../user-stories/18-controle-estoque.md) | Movimentações de estoque (entrada/saída), reserva/baixa e alerta de estoque baixo |
| [QA_PLAN_US-19](QA_PLAN_US-19.md) | [US-19 — Autenticação JWT](../user-stories/19-autenticacao-jwt.md) | Login, rotas protegidas/públicas, controle por papel (ADMIN, ATENDENTE, MECANICO, ESTOQUISTA, CLIENTE), expiração de token e usuário desativado |
| [QA_PLAN_US-20](QA_PLAN_US-20.md) | [US-20 — Notificação ao Cliente](../user-stories/20-notificacao-cliente.md) | Validação manual do módulo de notificação (e-mail/webhook) nas transições de status da OS |

> Backfill dos QA Plans das demais histórias: ver [US-F3-DOC-07](../user-stories/f3-doc-07-qa-plans-backfill.md).
