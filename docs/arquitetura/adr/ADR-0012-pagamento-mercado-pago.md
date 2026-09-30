# ADR-0012: Pagamento com Mercado Pago (Checkout Pro + webhook)

**Status:** Aceita
**Data:** 2026-09-30

## Contexto

O enunciado torna obrigatória a integração de pagamentos com o **Mercado Pago**
no Billing. É preciso decidir o produto de checkout, **quando** o pagamento
acontece no ciclo da OS e como o resultado chega ao sistema. Uber (pagamentos):
ordens **imutáveis**, idempotência por ID, "retries exponenciais por longos
períodos" como base de um pagamento confiável.

## Decisão

- **Checkout Pro**: o Billing cria uma *preference* (`external_reference` =
  número da OS, `notification_url` = rota pública do gateway) e devolve o
  `init_point`; o cliente paga no checkout hospedado — nenhum dado de cartão
  passa pelo nosso sistema.
- **Momento:** o pagamento acontece **na aprovação do orçamento** — novo status
  **`AGUARDANDO_PAGAMENTO`** entre `AGUARDANDO_APROVACAO` e `EM_EXECUCAO`. A
  execução só começa com pagamento aprovado (é o que torna a compensação
  "pagamento recusado → liberar reservas → cancelar" demonstrável).
- **Webhook** `POST /webhooks/mercadopago` público no gateway (sem JWT), validado
  por **`x-signature` (HMAC)** no Billing; o Billing **sempre consulta** o pagamento
  na API antes de agir; idempotente por `payment.id`.
- **Reconciliação:** job periódico consulta cobranças `PENDENTE` há mais de 15 min
  (webhook perdido) — recuperação para frente.
- **Estorno** via API quando a compensação exigir; **ledger** append-only registra
  orçamento, cobrança, pagamento e estorno (nunca se edita um lançamento).
- Credenciais (access token, segredo do webhook) no **Secrets Manager**; sandbox
  com cartões de teste para demo e BDD; **WireMock** simula o Mercado Pago no compose.

## Consequências

- Máquina de estados da OS ganha um status; UIs `admin`/`cliente` mostram o link de pagamento.
- A notificação "orçamento aprovado" passa a carregar o link de pagamento.
- Ambiente efêmero precisa da URL pública do gateway configurada na preference; o job de reconciliação cobre a janela em que o webhook não alcança o ambiente.
- Custos: sandbox gratuito; em produção real haveria taxa por transação (fora do escopo acadêmico).
