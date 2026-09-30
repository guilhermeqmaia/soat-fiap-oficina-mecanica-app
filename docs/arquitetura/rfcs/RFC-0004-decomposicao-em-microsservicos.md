# RFC-0004: Decomposição em microsserviços

**Status:** Aceita
**Data:** 2026-09-30
**Autores:** Time SOAT
**Stories relacionadas:** [US-F4-06](../../user-stories/f4-06-os-service-strangler.md), [US-F4-07](../../user-stories/f4-07-execucao-service.md), [US-F4-08](../../user-stories/f4-08-billing-orcamento.md), [plano da Fase 4](../../plano-execucao-fase-4.md)

## Contexto

A Fase 4 exige **no mínimo 3 microsserviços**, cada um com repositório,
infraestrutura e **banco próprios**, e proíbe acesso direto ao banco de outro
serviço. O monólito das Fases 1–3 tem cinco bounded contexts (Atendimento,
Catálogo, Estoque, Autenticação, Notificação) e eventos de domínio in-process
que a [ADR-0001](../adr/ADR-0001-padrao-de-comunicacao.md) já declarou "ponto
natural de corte". O enunciado sugere OS Service, Billing e Execução.

Insight de mercado: o iFood começou a modernização do middleware financeiro
por **Event Storming** e saiu com **três** serviços, um Postgres cada; a Uber
(DOMA) lembra que microsserviços trazem benefício **operacional**, não de
performance, e que cada serviço extra tem custo de integração real.

## Opções consideradas

### Opção A — 3 serviços alinhados ao enunciado (OS, Billing, Execução)

- OS Service = Atendimento (Cliente, Veículo, OrdemDeServico, histórico) + Notificação + orquestrador da saga
- Billing = Orçamento + Pagamento (Mercado Pago) + ledger
- Execução = fila de execução + diagnóstico + **Catálogo + Estoque**
- ✅ Espelha os exemplos do enunciado; três pipelines/bancos/deploys — custo de infra contido
- ✅ Catálogo/Estoque ficam com quem os usa: o mecânico adiciona peças e reserva estoque **durante o diagnóstico** — mesma transação local, sem saga interna
- ✅ O monólito atual já é ~70 % OS Service: evolução por *strangler*, não reescrita
- ❌ Execução concentra três contextos (Execução, Catálogo, Estoque) — mitigado por módulos NestJS separados no mesmo serviço e `architecture.spec.ts`

### Opção B — 5 serviços, um por bounded context

- ✅ Pureza DDD; Estoque e Catálogo independentes
- ❌ 5 repos, 5 pipelines, 5 bancos, 5 deploys no EKS; custo AWS e esforço de manutenção quase dobram
- ❌ A reserva de estoque no diagnóstico viraria **mais uma saga** (Execução ↔ Estoque) — complexidade sem valor didático adicional
- ❌ Com 4 pessoas e ~4 semanas, inviável com qualidade (80 % por serviço, BDD, Sonar)

### Opção C — 3 serviços com Estoque no OS Service

- ✅ Reaproveita o código de estoque já em Postgres
- ❌ O OS Service voltaria a conhecer produtos/preços — vazamento de contexto; a compensação "liberar reservas" ficaria no orquestrador em vez de no participante

## Decisão

**Opção A.** Três microsserviços: **OS Service**, **Billing Service** e
**Execução Service**. A Lambda de autenticação (Fase 3) permanece como quarto
componente serverless, inalterada.

| Serviço | Bounded contexts | Banco | Repositório |
|---|---|---|---|
| OS Service | Atendimento, Notificação, orquestração da saga | PostgreSQL `oficina_os` | `soat-fiap-oficina-mecanica-app` → `soat-fiap-oficina-os-service` |
| Billing Service | Orçamento, Pagamento (novo) | PostgreSQL `oficina_billing` | `soat-fiap-oficina-billing-service` |
| Execução Service | Execução (novo), Catálogo, Estoque | DynamoDB `oficina-execucao` | `soat-fiap-oficina-execucao-service` |

## Consequências

- A OS guarda **snapshot** dos itens (nome, quantidade, preço congelado) recebido por evento — nunca consulta o catálogo de outro serviço.
- "Banco próprio" é garantido por **credenciais e grants** ([US-F4-03](../../user-stories/f4-03-bancos-por-servico.md)), com teste negativo documentado.
- Código comum (auth, logs, mensageria, outbox) vai para o kit ([ADR-0010](../adr/ADR-0010-kit-compartilhado.md)).
- O repositório do monólito é renomeado (GitHub redireciona; links do PDF da Fase 3 continuam válidos) e segue como **hub de documentação**.
- A Lambda de auth continua lendo `cliente` por CPF no banco do OS Service — exceção consciente, registrada, porque a Lambda não é um dos três microsserviços e o acesso é somente leitura; alternativa (endpoint interno) fica como evolução.
