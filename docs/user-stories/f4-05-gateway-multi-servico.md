# US-F4-05: API Gateway Multi-servico e Webhook Publico do Mercado Pago

**User Story:** Como Cliente ou Staff, quero continuar usando uma unica URL publica com o mesmo token JWT, para que a quebra em microsservicos seja invisivel para quem consome a API.

**Prioridade:** Alta
**Story Points:** 5
**Status:** Em revisão — infra-k8s PR #31; validacao ponta a ponta quando o OS Service expuser NodePort (US-F4-06). QA: [QA_PLAN_US-F4-05](../qa-plans/QA_PLAN_US-F4-05.md)
**DDD Domain:** Transversal
**DDD Layer:** Infrastructure (Terraform)
**Repositorio:** 2 — `soat-fiap-oficina-infra-k8s` (stage `gateway/`)

## Contexto

A Fase 3 deixou um HTTP API com VPC Link -> NLB interno e um Lambda Authorizer.
Na Fase 4 o gateway roteia por prefixo para tres backends e expoe o webhook do
Mercado Pago (sem JWT, validado por assinatura no Billing).

## Criterios de Aceite

- [x] Rotas: `/ordens-servico*`, `/clientes*`, `/veiculos*`, `/auth/me`, `/notificacoes*` -> OS Service; `/orcamentos*`, `/pagamentos*` -> Billing; `/execucao*`, `/catalogo*`, `/estoque*` -> Execucao
- [x] **Um NLB interno** gerenciado pelo Terraform com um listener/target group por servico (NodePort) — em vez de um NLB por `Service` do Kubernetes (custo)
- [x] `POST /webhooks/mercadopago` publico (sem authorizer), throttle proprio, encaminhado ao Billing que valida `x-signature`
- [x] Authorizer da Lambda inalterado; CORS e throttling da Fase 3 mantidos
- [x] Rotas `/api` (Swagger) de cada servico acessiveis apenas internamente (documentado)
- [x] Outputs por servico (`service_listeners`, `internal_nlb_dns`, `route_map`); smoke em `/health` pelo `aws-deploy-all.sh` (o gateway so expoe `/health` do OS — os demais servicos sao checados pelo health check do NLB)
## Dependencias

- [US-F4-04](f4-04-repos-e-cicd-por-servico.md)
