# ADR-0013: API Gateway multi-serviço

**Status:** Aceita
**Data:** 2026-09-30

## Contexto

A [ADR-0005](ADR-0005-api-gateway.md) definiu um HTTP API com Lambda
Authorizer e VPC Link → NLB interno, com uma rota *catch-all* para o monólito.
Agora há três backends. Uber (DOMA) mostra o valor de um gateway estável por
domínio: serviços internos mudam (meia-vida de 1,5 ano), o contrato externo não.

## Decisão

- **Mesmo HTTP API**, mesmo authorizer, mesmas políticas de CORS e throttling.
- **Roteamento por prefixo** para três integrações VPC Link:
  `/ordens-servico*`, `/clientes*`, `/veiculos*`, `/auth/me`, `/notificacoes*` → OS Service;
  `/orcamentos*`, `/pagamentos*` → Billing; `/execucao*`, `/catalogo*`, `/estoque*` → Execução.
- **Um único NLB interno** gerenciado pelo Terraform, com **um listener/target group
  por serviço** (NodePort do `Service` de cada deployment) — em vez de um NLB por
  `Service` do Kubernetes (custo ×3).
- `POST /webhooks/mercadopago` **sem authorizer**, com throttle próprio, roteado ao
  Billing, que valida a assinatura ([ADR-0012](ADR-0012-pagamento-mercado-pago.md)).
- Swagger (`/api`) de cada serviço continua **interno** (não exposto no gateway).

## Consequências

- Clientes da API não percebem a decomposição: mesma URL, mesmo token.
- O CD de cada serviço publica seu NodePort/target; o stage `gateway/` lê esses
  valores (SSM/outputs) — ordem de deploy documentada nos scripts `aws-deploy-all.sh`.
- Adicionar um quarto serviço = novo prefixo + novo listener, sem tocar nos existentes.
