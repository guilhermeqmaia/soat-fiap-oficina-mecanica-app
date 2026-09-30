# RFC-0007: Banco NoSQL para o Execução Service

**Status:** Aceita
**Data:** 2026-09-30
**Autores:** Time SOAT
**Stories relacionadas:** [US-F4-03](../../user-stories/f4-03-bancos-por-servico.md), [US-F4-07](../../user-stories/f4-07-execucao-service.md)

## Contexto

O enunciado obriga **pelo menos um banco não relacional**. Precisamos escolher
qual serviço o usa e qual tecnologia. Candidatos: a execução da OS (fila,
timeline de diagnóstico/reparos, itens) e o estoque (saldos com reservas). O
Billing fica em SQL por exigir ACID sobre dinheiro
([RFC-0002](RFC-0002-escolha-do-banco.md) continua valendo para os serviços
relacionais).

Insights: o iFood usa **DynamoDB** como índice de eventos de pedidos (fallback
do Order Events) e como store de 1,3 bi de itens de perfil com `account_id`
como partition key; a Uber construiu o primeiro ledger fortemente consistente
de pagamentos em **DynamoDB** (uma linha por entidade, ~1 KB).

## Opções consideradas

### Opção A — Amazon DynamoDB (single-table)

- ✅ Serverless, **free tier** (25 GB, 25 WCU/RCU) cobre a fase; zero operação
- ✅ **Conditional writes** resolvem reserva de estoque (`saldo - reservado >= qtd`) sem lock
- ✅ **DynamoDB Streams** dá o outbox "de graça" (mudanças → publicação SNS)
- ✅ DynamoDB Local para compose/BDD; Terraform nativo
- ✅ Modelo de acesso da Execução é por chave (OS, mecânico, produto) — sem joins
- ❌ Consultas ad hoc limitadas — mitigado por GSIs (fila por status, por mecânico) e pelo fato de relatórios ficarem no OS Service
- ❌ Modelagem single-table exige disciplina (documentada na story)

### Opção B — MongoDB (Atlas ou DocumentDB)

- ✅ Documentos flexíveis, queries ricas, familiar
- ❌ DocumentDB: ~US$ 50+/mês para a menor instância; Atlas free tier fora da VPC (viola "tudo dentro da VPC")
- ❌ Sem equivalente nativo a Streams+Lambda para outbox (change streams exige réplica)

### Opção C — Redis (ElastiCache)

- ✅ Fila de execução natural (listas/streams)
- ❌ Não é banco primário durável para o domínio; ElastiCache custa por hora ligado
- ❌ Não atende a leitura de "não relacional como banco próprio" com segurança

## Decisão

**Opção A — DynamoDB** como banco próprio do **Execução Service**, tabela
única `oficina-execucao`:

| Entidade | PK | SK | Notas |
|---|---|---|---|
| Execução da OS | `EXECUCAO#<numeroOS>` | `META` / `ITEM#<n>` / `EVENTO#<ts>` | status da fila, mecânico, itens com preço congelado, timeline |
| Catálogo | `SERVICO#<id>` / `PRODUTO#<id>` | `META` | nome, preço, ativo |
| Estoque | `ESTOQUE#<produtoId>` | `META` / `MOV#<ts>` | saldo, reservado, movimentações |
| Dedup de mensagens | `MSG#<messageId>` | `META` | TTL 7 dias |

GSIs: `GSI1` (status da fila → OS), `GSI2` (mecânico → OS). PITR ligado; Streams `NEW_AND_OLD_IMAGES`.

## Consequências

- O Execução Service **não usa Prisma**; usa o SDK v3 (`@aws-sdk/lib-dynamodb`) com repositórios por agregado.
- O estoque migra do Postgres (Fase 2) para DynamoDB — seeds recriados; não há dados de produção a migrar.
- O kit fornece o adaptador de outbox via Streams e o de deduplicação ([ADR-0009](../adr/ADR-0009-outbox-e-consumidor-idempotente.md)).
- Justificativa "SQL + NoSQL" para o PDF: Postgres onde há dinheiro e relações (OS, Billing); DynamoDB onde há documentos com timeline e escrita por chave (Execução).
