# ADR-0003: Aplicação como Resource Server (valida-apenas)

**Status:** Aceita
**Data:** 2026-08-24
**RFC de origem:** [RFC-0003](../rfcs/RFC-0003-estrategia-de-autenticacao.md)

## Contexto

A Fase 3 introduz a Lambda de autenticação por CPF como emissora de JWT. Dois
emissores (Lambda + monólito) significariam dois segredos, dois formatos de
claims e uma superfície de auditoria duplicada.

## Decisão

O monólito NestJS **não emite tokens**: atua como **resource server**,
validando o JWT (assinatura HS256 com o segredo compartilhado via Secrets
Manager, `iss` e `exp`) e aplicando **autorização por role/claim** (ex.:
CLIENTE acessa apenas as próprias OS). `POST /auth/login` e toda a lógica de
emissão/senha saem do monólito (US-F3-03) — o hash de senha do staff migra
para a Lambda.

A validação acontece **duas vezes de propósito**: o Lambda Authorizer barra
requisições sem token na borda (nem chegam à VPC) e o app revalida + autoriza
por regra de negócio — defesa em profundidade.

## Consequências

- Uma única fonte de verdade de autenticação (a Lambda); rotação de segredo
  em um lugar (Secrets Manager).
- Guards/decorators (`@Public()`, `@Roles()`, `@CurrentUser()`) permanecem —
  só a estratégia JWT muda de "emitida por mim" para "emitida pela Lambda".
- As UIs migram do `POST /auth/login` para `POST {gateway}/auth`.
- A lista de rotas `@Public()` do app vira contrato com o gateway (rotas
  públicas explícitas — ver ADR-0005): endpoint público novo exige rota nova
  no Terraform do gateway.
