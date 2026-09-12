# QA Plan — US-F3-03: Aplicacao como Resource Server (validacao de JWT)

## Resumo
Valida que o monolito **nao emite tokens**: `/auth/login` removido, guard valida tokens da Lambda (segredo, `iss`, `exp`), `@Public()` preservado, autorizacao por role/claim, codigo morto removido, Swagger e docs atualizados, `architecture.spec.ts` verde.

## Pre-requisitos
- Local: `npm ci`, Docker (testcontainers) — para os testes automatizados
- Nuvem (opcional): ambiente no ar com `GW`; tokens do QA_PLAN_US-F3-01
- `JWT_SECRET`/`JWT_ISSUER` da app iguais aos da Lambda (no EKS: Secret `oficina-app` sincronizado do Secrets Manager; `JWT_ISSUER=oficina-auth-lambda` no ConfigMap)

## Cenarios de Teste

### TS-01: `POST /auth/login` nao existe mais
- **Tipo:** Ambos
- **Criterio:** Remover `/auth/login` e a emissao de token
- **Passos:**
  1. `grep -rn "auth/login\|sign(" src --include='*.ts' | grep -v spec | grep -v testing`
  2. Com a app no ar: `curl -s -X POST $GW/auth/login -d '{}' -w ' -> %{http_code}'` (ou `http://localhost:3000/auth/login`)
- **Resultado esperado:** nenhuma rota/servico de login; resposta `404` (local) ou `401` (via gateway, catch-all protegido)

### TS-02: Token da Lambda e aceito
- **Tipo:** Ambos
- **Criterio:** Guard valida tokens emitidos pela Lambda (mesmo segredo, `iss`, `exp`)
- **Passos:**
  1. `TOKEN=$(curl -s -X POST $GW/auth -H 'content-type: application/json' -d '{"cpf":"52998224725","senha":"admin123"}' | jq -r .accessToken)`
  2. `curl -s $GW/clientes -H "Authorization: Bearer $TOKEN" -w ' -> %{http_code}'`
- **Resultado esperado:** `200` — a app validou assinatura HS256 + `iss` sem chamar a Lambda
- **Automatizado:** `src/auth/auth.e2e.spec.ts` "aceita token valido emitido com o segredo/issuer compartilhados"

### TS-03: Token com issuer diferente e rejeitado
- **Tipo:** Automatizado
- **Criterio:** Checagem de `iss`
- **Passos:**
  1. `npx jest src/auth/auth.e2e.spec.ts -t "issuer"`
- **Resultado esperado:** token assinado com o mesmo segredo mas `iss: "monolito-antigo"` -> `401`

### TS-04: Token expirado / assinatura invalida
- **Tipo:** Automatizado
- **Criterio:** Checagem de `exp` e assinatura
- **Passos:**
  1. `npx jest src/auth -t "expirad|invalid|assinatura"`
- **Resultado esperado:** `401` em ambos; mensagem sem detalhes internos

### TS-05: Rotas publicas continuam publicas
- **Tipo:** Ambos
- **Criterio:** `@Public()` mantido
- **Passos:**
  1. `curl -s $GW/health` -> 200; `curl -s "$GW/ordens-servico/numero/<numero>/status"` -> 200, ambos sem token
- **Resultado esperado:** 200; no gateway essas rotas tambem estao sem authorizer (QA_PLAN_US-F3-02 TS-04)

### TS-06: Autorizacao por role/claim
- **Tipo:** Ambos
- **Criterio:** `CLIENTE` so acessa as proprias OS; roles de staff
- **Passos:**
  1. Token de cliente (`{"cpf":"39053344705"}`): `GET $GW/clientes` -> `403 role insuficiente`
  2. `GET $GW/clientes/39053344705/ordens-servico` -> `200`
  3. `GET $GW/clientes/11144477735/ordens-servico` -> `403 CPF/CNPJ nao pertence ao usuario autenticado`
  4. Token de mecanico: `POST $GW/ordens-servico/<id>/atribuir-mecanico` -> 200/201
- **Resultado esperado:** conforme os passos (evidencia 12/09/2026: 403 / 200 / 403 / 200)
- **Automatizado:** `src/auth/role-based-access.e2e.spec.ts`

### TS-07: Codigo morto de login removido sem quebrar `usuario`
- **Tipo:** Automatizado
- **Criterio:** Remover/reaproveitar codigo de login; `architecture.spec.ts` verde
- **Passos:**
  1. `grep -rln "bcrypt\|senha_hash" src | grep -v spec` — restos so onde `usuario` ainda precisa (seed/dominio)
  2. `npx jest src/architecture.spec.ts`
- **Resultado esperado:** sem `AuthService.login`/`LocalStrategy`; regra de dependencia preservada

### TS-08: Swagger e docs atualizados
- **Tipo:** Manual
- **Criterio:** Swagger sem `/auth/login`, header `Authorization: Bearer`; `docs/curls-usuario.md` atualizado
- **Passos:**
  1. Abrir `http://localhost:3000/api` (ou `$GW/api` com token) e procurar `auth/login`
  2. `grep -rn "auth/login" docs/ README.md`
- **Resultado esperado:** ausente no Swagger; `bearerAuth` configurado; docs apontam para `POST /auth` do gateway (CPF)

### TS-09: Migracao do staff documentada
- **Tipo:** Manual
- **Criterio:** Como o staff passa a autenticar
- **Passos:**
  1. Conferir RFC de autenticacao (`docs/arquitetura/rfcs/`) e README da Lambda (fluxo `{cpf, senha}`; seeds com CPFs validos por role)
- **Resultado esperado:** documentado que staff autentica pela Lambda com CPF + senha (`usuario.cpf` + `senha_hash`)

## Casos de Borda
- Header `Authorization` sem `Bearer ` -> 401
- Token de cliente cujo `sub` nao existe mais no banco -> 401/403 (conforme guard), nunca 500
- Duas apps (app + Lambda) com segredos diferentes apos rotacao -> todos 401: rotacionar via `JWT_SECRET_ID` e redeploy dos dois

## Rastreabilidade

| Criterio de Aceite | Cenarios |
|---|---|
| Remover `/auth/login` e emissao de token | TS-01 |
| Guard valida tokens da Lambda (segredo, `iss`, `exp`) | TS-02, TS-03, TS-04 |
| Rotas sensiveis exigem token; `@Public()` mantido | TS-02, TS-05 |
| Autorizacao por role/claim | TS-06 |
| Codigo morto removido sem quebrar `usuario` | TS-07 |
| Migracao/documentacao do staff | TS-09 |
| `architecture.spec.ts` verde | TS-07 |
| Swagger atualizado | TS-08 |
| Testes do guard atualizados | TS-03, TS-04, TS-06 |
| Docs (`curls-usuario.md`) atualizados | TS-08 |

## Checklist de Validacao
- [x] Todos os criterios cobertos
- [x] Casos de borda documentados
- [x] Fluxos de erro documentados
- [x] Instrucoes de setup claras

## Comandos Uteis
```bash
npx jest src/auth src/architecture.spec.ts
```
