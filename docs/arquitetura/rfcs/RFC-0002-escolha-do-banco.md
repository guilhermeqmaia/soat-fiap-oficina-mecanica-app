# RFC-0002: Escolha do banco de dados gerenciado

**Status:** Aceita
**Data:** 2026-08-24
**Autores:** Time SOAT
**Stories relacionadas:** [US-F3-04](../../user-stories/f3-04-terraform-banco-gerenciado.md), [US-F3-DOC-04](../../user-stories/f3-doc-04-justificativa-banco-er.md)

## Contexto

A Fase 3 exige um **banco gerenciado** em nuvem. As Fases 1–2 rodam
PostgreSQL (in-cluster no kind) com **Prisma** e um histórico de migrations em
produção. O domínio (ordens de serviço, reservas/baixas de estoque,
orçamentos) depende de transações ACID. Consumidores: o monólito NestJS no
EKS e a Lambda de autenticação por CPF (consulta de clientes).

## Opções consideradas

### Opção A — Amazon RDS for PostgreSQL (Multi-AZ)

- ✅ **Mesmo dialeto e migrations** das Fases 1–2 — zero mudança no Prisma
- ✅ ACID completo; tipos ricos (enums de status de OS, decimais monetários)
- ✅ Multi-AZ com failover automático, backups e patches gerenciados
- ❌ Custo por hora de instância (mitigado: instância pequena no Academy)

### Opção B — Amazon Aurora PostgreSQL

- ✅ Compatível com Postgres; melhor escala de leitura
- ❌ Custo maior; capacidade extra irrelevante para o volume do MVP
- ❌ Recursos serverless v2 desnecessários para carga contínua pequena

### Opção C — Amazon DynamoDB

- ✅ Serverless, barato em baixa escala
- ❌ **Reescrita completa da camada de dados** (Prisma/SQL → NoSQL),
  perda das migrations e do modelo relacional já validado
- ❌ Transações multi-item limitadas frente ao fluxo de OS + estoque

### Opção D — Postgres autogerenciado no EKS (como na Fase 2)

- ✅ Custo mínimo
- ❌ **Não atende o enunciado** (exige banco *gerenciado*); backup/HA por
  nossa conta

## Decisão

**Amazon RDS for PostgreSQL**, Multi-AZ, em subnets privadas da VPC.
Critérios decisivos: continuidade total de dialeto/migrations e exigência de
banco gerenciado com HA.

## Consequências

- Repositório dedicado de infra: `soat-fiap-oficina-infra-db` (US-F3-04),
  com contrato de saída `DATABASE_URL` via Secrets Manager.
- Acesso **somente** de dentro da VPC (security groups: EKS nodes + Lambda).
- A **justificativa formal detalhada** (requisitos × alternativas), o
  diagrama ER, a explicação de cada relacionamento e a estratégia de
  índices/consistência estão em
  [`docs/arquitetura/banco-de-dados.md`](../banco-de-dados.md) (US-F3-DOC-04);
  `docs/schema.dbml` é a fonte do ER.
- O job de migrations (`prisma migrate deploy`) do deploy no EKS passa a
  apontar para o RDS.
