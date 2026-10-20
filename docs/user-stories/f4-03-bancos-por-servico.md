# US-F4-03: Bancos por Servico — Postgres (OS, Billing) e DynamoDB (Execucao)

**User Story:** Como Plataforma, quero que cada microsservico tenha seu proprio banco com credenciais exclusivas, para que nenhum servico acesse os dados de outro e o requisito SQL + NoSQL seja atendido.

**Prioridade:** Alta
**Story Points:** 5
**Status:** Em revisão — infra-db PR #9 mergeado (secrets por servico, DynamoDB, job de bootstrap); bootstrap e teste negativo executam no proximo ciclo de deploy. QA: [QA_PLAN_US-F4-03](../qa-plans/QA_PLAN_US-F4-03.md)
**DDD Domain:** Transversal
**DDD Layer:** Infrastructure (Terraform)
**Repositorio:** 3 — `soat-fiap-oficina-infra-db` (+ stage `dynamodb/` no infra-k8s)

## Contexto

Requisito destacado no enunciado: nenhum servico acessa diretamente o banco de
outro. Regra aplicada por **credenciais e grants**, nao por convencao.

## Criterios de Aceite

- [x] **Postgres:** bancos `oficina_os` e `oficina_billing` com usuarios exclusivos (sem grant cruzado); decisao instancia unica vs duas instancias RDS registrada (custo) e parametrizada por variavel Terraform
- [x] `DATABASE_URL` de cada servico em segredo proprio no Secrets Manager (`oficina/os/database-url`, `oficina/billing/database-url`)
- [x] **DynamoDB:** tabela `oficina-execucao` (single-table: `PK`/`SK`, GSI por status da fila e por mecanico), TTL para itens de deduplicacao, PITR ligado
- [x] DynamoDB Streams habilitado (base do outbox da Execucao)
- [x] Lambda de auth continua lendo apenas o que precisa (cliente por CPF) do banco do OS Service — documentado como excecao consciente ou migrado para API
- [x] Teste negativo documentado: credencial do Billing tentando ler `oficina_os` -> permission denied
- [x] Migrations Prisma separadas por servico (template do kit); job de migrations por servico no deploy
## Dependencias

- [US-F4-DOC-01](f4-doc-01-rfcs.md) (RFC-0007)
