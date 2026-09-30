# US-F4-09: Billing Service — Pagamento com Mercado Pago (Checkout + Webhook)

**User Story:** Como Cliente, quero pagar o orcamento aprovado pelo Mercado Pago e ter a OS liberada para execucao automaticamente, para nao depender de conferencia manual.

**Prioridade:** Alta
**Story Points:** 8
**Status:** To Do
**DDD Domain:** Billing (Pagamento)
**DDD Layer:** Infrastructure (integracao externa) + Application
**Repositorio:** `soat-fiap-oficina-billing-service`

## Contexto

Obrigatorio no enunciado: integrar pagamentos com o Mercado Pago. Decisao
(ADR-0012): **Checkout Pro** — o Billing cria uma *preference* e o cliente paga
no checkout hospedado; o Mercado Pago notifica por **webhook**. O sandbox tem
cartoes de teste que produzem pagamento aprovado/recusado/pendente de forma
deterministica — perfeito para demonstrar a compensacao no video.

## Criterios de Aceite

- [ ] Credenciais (access token de teste/producao) e segredo do webhook no **Secrets Manager**; nunca no repo
- [ ] Ao aprovar orcamento: cria preference (`external_reference` = numero da OS, `notification_url` = rota publica do gateway) e persiste `Cobranca` (PENDENTE) com o `init_point`
- [ ] `POST /webhooks/mercadopago`: valida **`x-signature`** (HMAC) e `x-request-id`; consulta o pagamento na API (nunca confia so no payload); **idempotente** por `payment.id`
- [ ] Pagamento `approved` -> `billing.pagamento-aprovado`; `rejected`/`cancelled` -> `billing.pagamento-recusado`; `pending`/`in_process` -> mantem PENDENTE
- [ ] Reconciliacao: job que consulta cobrancas PENDENTES ha mais de X min (webhook perdido) — recuperacao para frente
- [ ] Estorno via API quando a compensacao exigir (`billing.cancelar-orcamento` com pagamento aprovado)
- [ ] Testes com o SDK mockado + roteiro no QA Plan usando os cartoes de teste do sandbox
- [ ] Logs mascaram dados do pagador
## Dependencias

- [US-F4-08](f4-08-billing-orcamento.md), [US-F4-05](f4-05-gateway-multi-servico.md)

## Referencias

- Documentacao do Mercado Pago: Checkout Pro, Webhooks (assinatura), cartoes de teste
