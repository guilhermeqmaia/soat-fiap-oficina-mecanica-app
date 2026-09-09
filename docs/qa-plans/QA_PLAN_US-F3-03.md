# QA Plan — US-F3-03: Aplicacao como Resource Server (validacao de JWT)

## Summary
Valida que o monolito (`soat-fiap-oficina-mecanica-app`) deixou de emitir tokens e passou a apenas validar o JWT emitido pela Lambda de CPF: remocao do `POST /auth/login`, `JwtStrategy` validando assinatura/`iss`/`exp`, `RolesGuard` autorizando por claim, rotas publicas preservadas e regras de arquitetura (`architecture.spec.ts`) intactas.

## Prerequisites
- App rodando localmente (`docker compose up -d` + `npm run start:dev`) ou testes automatizados via `npm run test:unit` / `npm run test:integration`
- `JWT_SECRET` e `JWT_ISSUER` configurados iguais aos usados pela Lambda (`oficina-auth-lambda` por padrao)
- Tokens de teste: gerar via `src/auth/testing/token-factory.ts` (helper de testes) para cada role (ADMIN, ATENDENTE, MECANICO, ESTOQUISTA, CLIENTE)

## Test Scenarios

### TS-01: POST /auth/login removido
- **Type:** Automated (e2e) / Manual
- **Acceptance criterion:** Remover POST /auth/login e a logica de emissao de token
- **Steps:**
  1. `curl -X POST {app_url}/auth/login -d '{"email":"x","senha":"y"}'`
  2. Verificar Swagger (`/api` ou `/docs`) e confirmar ausencia do endpoint
- **Expected result:** 404 (rota nao existe) e endpoint ausente do Swagger

### TS-02: GET /auth/me retorna identidade do token da Lambda
- **Type:** Automated (e2e)
- **Acceptance criterion:** Guard/estrategia valida tokens emitidos pela Lambda
- **Precondition:** Token valido gerado com o mesmo segredo/`iss` da Lambda
- **Steps:**
  1. `GET /auth/me` com `Authorization: Bearer <token>`
  2. Verificar resposta com `id`, `nome`, `cpf`, `role` extraidos das claims
- **Expected result:** 200 com os dados do payload do token, sem consulta ao banco

### TS-03: Token com `iss` diferente e rejeitado
- **Type:** Automated (unit — `jwt.strategy.spec.ts`)
- **Acceptance criterion:** Checagem de `iss` e `exp`
- **Steps:**
  1. Gerar token com `iss` diferente de `oficina-auth-lambda` (mesmo segredo)
  2. `GET /auth/me` com esse token
- **Expected result:** 401 Unauthorized

### TS-04: Token expirado e rejeitado
- **Type:** Automated (unit/integration)
- **Steps:**
  1. Gerar token com `exp` no passado
  2. Chamar rota protegida
- **Expected result:** 401 Unauthorized

### TS-05: Token sem claims obrigatorias (`sub`/`role`)
- **Type:** Automated (unit — `jwt.strategy.spec.ts`)
- **Acceptance criterion:** `validate()` exige `sub` e `role` validos
- **Steps:**
  1. Gerar token sem `sub` ou com `role` fora do enum `Role`
  2. Chamar rota protegida
- **Expected result:** 401 "Token sem as claims obrigatorias (sub/role)"

### TS-06: Rotas publicas continuam acessiveis sem token
- **Type:** Automated (e2e)
- **Acceptance criterion:** `@Public()` mantido para rotas publicas (ex.: consulta de status de OS)
- **Steps:**
  1. Chamar endpoint `@Public()` (ex.: consulta de status de OS, `/health`, `/metrics`) sem token
- **Expected result:** 200

### TS-07: Autorizacao por role/claim — CLIENTE so acessa as proprias OS
- **Type:** Automated (e2e — `role-based-access.e2e.spec.ts`)
- **Acceptance criterion:** Autorizacao por role/claim derivada do token
- **Steps:**
  1. Autenticar como CLIENTE A (token com `sub`=id do cliente A)
  2. Tentar acessar OS pertencente ao cliente B
  3. Acessar OS pertencente ao proprio cliente A
- **Expected result:** 403 (ou 404, conforme politica) no passo 2; 200 no passo 3

### TS-08: Roles de staff preservadas (ADMIN/ATENDENTE/MECANICO/ESTOQUISTA)
- **Type:** Automated (e2e — reaproveita `role-based-access.e2e.spec.ts`)
- **Steps:**
  1. Repetir os cenarios de `RolesGuard` (equivalente ao TS-08/09/10 do QA_PLAN_US-19) usando tokens emitidos no novo formato (claims da Lambda)
- **Expected result:** Mesmo comportamento de autorizacao por role de antes, agora com token de origem diferente

### TS-09: Codigo morto de login removido sem quebrar o dominio de usuario
- **Type:** Automated (unit) / Manual (code review)
- **Acceptance criterion:** Remover/reaproveitar codigo morto de login sem quebrar `usuario`
- **Steps:**
  1. Rodar suite completa de testes do modulo `auth` e `usuario`
  2. Revisar se hashing de senha (bcrypt) permanece apenas onde ainda faz sentido (ex.: se staff ainda loga com senha em algum fluxo local/administrativo)
- **Expected result:** Testes verdes; nenhuma referencia orfã a `POST /auth/login`

### TS-10: architecture.spec.ts continua verde
- **Type:** Automated (unit)
- **Acceptance criterion:** Regra de dependencia preservada
- **Steps:**
  1. `npx jest architecture --verbose` (ou o comando equivalente do `architecture.spec.ts`)
- **Expected result:** Todas as regras de camada/dependencia OK apos a remocao do login

### TS-11: Swagger atualizado
- **Type:** Manual
- **Acceptance criterion:** Atualizar Swagger (remover /auth/login, documentar Bearer)
- **Steps:**
  1. Abrir `/api` (Swagger UI) e conferir que `/auth/login` nao aparece e que `GET /auth/me` documenta `ApiBearerAuth`
- **Expected result:** Documentacao condizente com o novo contrato

### TS-12: Docs auxiliares atualizadas
- **Type:** Manual
- **Acceptance criterion:** Atualizar docs/curls-usuario.md e afins
- **Steps:**
  1. Revisar `docs/curls-usuario.md` (e arquivos similares) em busca de exemplos com `/auth/login`
- **Expected result:** Exemplos atualizados para o fluxo `POST {gateway}/auth` + `Authorization: Bearer`

### TS-13: Documentacao da migracao de autenticacao do staff
- **Type:** Manual
- **Acceptance criterion:** Migracao de dados/documentacao: como o staff passa a autenticar (conforme RFC de auth)
- **Steps:**
  1. Revisar a documentacao (README/docs) que descreve como o staff (ADMIN/ATENDENTE/MECANICO/ESTOQUISTA) passa a autenticar apos a remocao do login local
  2. Confirmar que a documentacao esta alinhada com a RFC de autenticacao ([f3-doc-01](../user-stories/f3-doc-01-rfcs.md))
- **Expected result:** Fluxo de autenticacao do staff documentado e consistente com a RFC

## Edge Cases
- Token assinado com segredo diferente (adulterado) — deve falhar na verificacao de assinatura antes mesmo de checar `iss`
- Token valido de CLIENTE tentando acessar rota exclusiva de staff — 403
- Requisicao sem header `Authorization` em rota nao marcada `@Public()` — 401
- UIs (`web/admin`, `web/cliente`) ainda apontando para o `/auth/login` antigo — deve ser tratado como risco documentado (ver Notas da US), nao um bug do backend

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| Remover POST /auth/login | TS-01 |
| Guard valida tokens da Lambda (iss/exp) | TS-02, TS-03, TS-04, TS-05 |
| Rotas publicas mantidas | TS-06 |
| Autorizacao por role/claim | TS-07, TS-08 |
| Remocao de codigo morto sem quebrar dominio | TS-09 |
| architecture.spec.ts verde | TS-10 |
| Swagger atualizado | TS-11 |
| Docs atualizadas | TS-12 |
| Migracao de dados/documentacao: como staff autentica | TS-13 |

## Validation Checklist
- [ ] Todos os criterios de aceite cobertos
- [ ] Edge cases documentados
- [ ] Fluxos de erro documentados
- [ ] Instrucoes de setup claras

## Useful Commands
```bash
# Testes unitarios e de integracao
npm run test:unit
npm run test:integration
npm run test:all:cov

# e2e de auth e RBAC
npx jest auth.e2e --verbose
npx jest role-based-access.e2e --verbose

# Regras de arquitetura
npx jest architecture --verbose

# Subir app localmente
docker compose up -d
npm run start:dev
```
