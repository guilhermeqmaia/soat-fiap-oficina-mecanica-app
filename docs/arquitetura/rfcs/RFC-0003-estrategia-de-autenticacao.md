# RFC-0003: Estratégia de autenticação (CPF serverless)

**Status:** Aceita
**Data:** 2026-08-24
**Autores:** Time SOAT
**Stories relacionadas:** [US-F3-01](../../user-stories/f3-01-serverless-cpf-auth.md), [US-F3-02](../../user-stories/f3-02-api-gateway.md), [US-F3-03](../../user-stories/f3-03-app-resource-server.md)

## Contexto

O enunciado exige proteger rotas sensíveis com **autenticação via CPF** por
uma **function serverless** que valida o CPF, consulta a existência/status do
cliente na base e devolve um **JWT**. Hoje o monólito autentica por
e-mail/senha (`POST /auth/login`) com roles ADMIN/ATENDENTE/MECANICO/
ESTOQUISTA/CLIENTE e emite os próprios tokens.

Questões a resolver: (1) quem emite o token; (2) como o **staff** se
autentica se o fluxo do enunciado é CPF de cliente; (3) qual gateway protege
as rotas; (4) formato/expiração do token.

## Opções consideradas

### Emissão do token

- **A — Lambda como único emissor; monólito vira resource server** ✅
  Uma única fonte de verdade de autenticação; superfície de ataque menor;
  atende o enunciado à risca. Custo: remover o login do monólito (US-F3-03) e
  migrar as UIs.
- **B — Dois emissores (Lambda para cliente, monólito para staff)** ❌
  Dois segredos/fluxos para auditar; drift de claims; o gateway teria que
  aceitar tokens de duas origens.

### Autenticação do staff (questão aberta do plano — resolvida)

Esclarecimento do professor no fórum: *"vocês podem utilizar e-mail e senha
como credenciais de acesso, desde que o CPF do cliente também seja validado e
associado corretamente ao usuário"*.

- **A — Staff usa CPF + senha na mesma Lambda** ✅
  A Lambda diferencia pelo payload: `{cpf}` → fluxo cliente;
  `{cpf, senha}` → fluxo staff (hash de senha migra do monólito para a
  Lambda). CPF validado e associado em ambos — conforme sancionado.
- **B — Fator adicional exótico (OTP, magic link)** ❌ complexidade sem
  exigência do enunciado.
- **C — Manter login e-mail/senha no monólito só para staff** ❌ recai na
  opção B de emissão (dois emissores).

### Gateway

AWS API Gateway × Kong × Traefik — processo e decisão em
[ADR-0005](../adr/ADR-0005-api-gateway.md) (resumo: AWS API Gateway HTTP API,
com Lambda Authorizer).

### Formato do token

- **HS256 com segredo compartilhado via AWS Secrets Manager** ✅ — simples,
  o monólito valida com o mesmo segredo; o JWT Authorizer nativo do gateway
  exigiria OIDC/JWKS (RS256), que não teremos — por isso **Lambda Authorizer**.
- Claims: `sub` (id), `cpf`, `role`, `iss` (identificador da Lambda), `exp`
  (60 min). Sem refresh token no MVP — reautenticação por CPF é barata.

## Decisão

**Lambda única** (repo `soat-fiap-oficina-auth-lambda`) como **único emissor
de JWT**, atendendo cliente (só CPF) e staff (CPF + senha) e servindo também
de **Lambda Authorizer** do gateway. Monólito vira **resource server**
(valida-apenas: assinatura, `iss`, `exp`) e mantém a autorização por
role/claim. `POST /auth/login` é removido (US-F3-03).

## Consequências

- US-F3-01 implementa os dois fluxos + handler de authorizer; hash de senha
  migra do monólito para a Lambda.
- US-F3-03 remove emissão/login do monólito e adapta guards + UIs
  (`web/admin`, `web/cliente` passam a chamar `POST {gateway}/auth`).
- Rotas públicas explícitas no gateway; o resto exige `Authorization: Bearer`
  ([ADR-0003](../adr/ADR-0003-app-resource-server.md),
  [ADR-0005](../adr/ADR-0005-api-gateway.md)).
- Dupla validação (borda + app) é intencional — defesa em profundidade,
  endossada pelo professor no fórum.
