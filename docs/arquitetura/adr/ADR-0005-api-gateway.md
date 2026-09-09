# ADR-0005: API Gateway (AWS API Gateway HTTP API)

**Status:** Aceita
**Data:** 2026-08-24
**RFC de origem:** [RFC-0003](../rfcs/RFC-0003-estrategia-de-autenticacao.md)

## Contexto

O enunciado pede um gateway (AWS API Gateway, Kong ou Traefik) como porta de
entrada, protegendo rotas sensíveis com a autenticação por CPF. Restrições:
AWS Academy (sem criar IAM roles), topologia com tudo privado na VPC e
integração nativa com a Lambda de auth.

Alternativas: **Kong** e **Traefik** rodariam *in-cluster* — flexíveis, mas
somariam operação (upgrade, HA, TLS) ao nosso encargo, ficariam *dentro* do
cluster que deveriam proteger e não teriam integração nativa com Lambda.

## Decisão

**AWS API Gateway, variante HTTP API (v2)** — implementado em
`soat-fiap-oficina-infra-k8s/gateway` (US-F3-02):

- **HTTP API e não REST API**: access logs sem a role de conta do CloudWatch
  (que o Academy não permite criar), CORS/throttling nativos, VPC Link para
  ALB interno e custo menor.
- **Proteção via Lambda Authorizer** (REQUEST, payload 2.0, cache 300s) — o
  JWT é HS256 com segredo compartilhado; o JWT Authorizer nativo exigiria
  OIDC/JWKS (RS256).
- **Estratégia de roteamento: proxy** (`ANY /{proxy+}` → app), com rotas
  explícitas apenas onde a política de borda difere: `POST /auth` → Lambda e
  as rotas públicas (health, status de OS, webhooks de aprovação). O contrato
  da API continua documentado pelo Swagger da aplicação (API-first foi
  avaliado e descartado: os recursos que o justificariam, como validação de
  payload na borda, só existem no REST API; orientação do professor no fórum
  respalda proxy para times que priorizam agilidade).
- **Só o gateway é público**: backend alcançado por VPC Link → ALB interno.

## Consequências

- Governança de borda centralizada: throttling, CORS, access logs JSON e a
  distinção público × protegido vivem no Terraform do gateway.
- A lista de rotas públicas do gateway espelha os `@Public()` do app —
  acoplamento pequeno e proposital (mudança de política passa por revisão de
  infra); manter as duas listas em sincronia é responsabilidade de quem cria
  endpoint público novo.
- Zero operação de gateway para o time (gerenciado pela AWS).
- Dependência do formato de eventos/authorizer do API Gateway na Lambda
  (payload 2.0, simple responses) — contrato registrado no repo da Lambda.
