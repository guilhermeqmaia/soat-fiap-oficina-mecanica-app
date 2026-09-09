# QA Plan — US-F3-01: Function Serverless de Autenticacao por CPF

## Summary
Valida a Lambda de autenticacao (`soat-fiap-oficina-auth-lambda`), unica emissora de JWT do sistema. Cobre os dois fluxos do handler `POST /auth` — cliente (`{cpf}`) e staff (`{cpf, senha}`) — incluindo validacao de CPF, consulta de existencia/status na base, geracao do JWT e o contrato de erros (`400/403/404/422/500`).

## Prerequisites
- Node.js 20+, dependencias instaladas (`npm install`)
- Banco Postgres acessivel (local ou testcontainer) com tabelas `cliente` e `usuario` seedadas
- Variaveis de ambiente: segredo JWT resolvido via `src/infra/secrets.ts` (Secrets Manager em nuvem; `.env` local para testes)
- Para teste manual: `npm run docker:build && npm run docker:run` (Lambda local na porta 9000) ou `npm run invoke:local`
- Massa de dados: 1 cliente ativo, 1 cliente inativo/bloqueado, 1 CPF sem cadastro, 1 usuario staff ativo, 1 usuario staff inativo

## Test Scenarios

### TS-01: Autenticacao de cliente com CPF valido e existente
- **Type:** Automated (unit + integration) / Manual
- **Acceptance criterion:** Endpoint recebe CPF; consulta existencia/status; gera JWT
- **Precondition:** Cliente ativo cadastrado com CPF conhecido
- **Steps:**
  1. `POST /auth` com `{ "cpf": "<cpf válido e cadastrado>" }`
  2. Verificar status 200
  3. Verificar resposta com `accessToken`, `tokenType: "Bearer"`, `expiresAt`, `cliente.{id,nome,cpf,role}`
  4. Decodificar o JWT e verificar claims `sub`, `cpf`, `role`, `iss`, `exp`
- **Expected result:** 200 com JWT valido e CPF mascarado na resposta (`***.***.***-XX`)
- **Alternative result (error):** N/A

### TS-02: CPF ausente no body
- **Type:** Automated (unit)
- **Acceptance criterion:** Contrato de erro 400
- **Steps:**
  1. `POST /auth` com body `{}` ou body vazio
- **Expected result:** 400, `code: CPF_AUSENTE`

### TS-03: CPF com formato invalido (digitos verificadores)
- **Type:** Automated (unit)
- **Acceptance criterion:** Validacao de CPF antes de consultar a base; contrato 422
- **Steps:**
  1. `POST /auth` com `{ "cpf": "11111111111" }` (sequencia repetida)
  2. `POST /auth` com `{ "cpf": "12345678900" }` (digito verificador errado)
- **Expected result:** 422, `code: CPF_INVALIDO` nos dois casos, sem consultar o banco

### TS-04: Cliente inexistente
- **Type:** Automated (integration)
- **Acceptance criterion:** Regra de status: cliente inexistente -> 404
- **Steps:**
  1. `POST /auth` com CPF valido (digitos corretos) mas nao cadastrado
- **Expected result:** 404, `code: CLIENTE_NAO_ENCONTRADO`

### TS-05: Cliente inativo/bloqueado
- **Type:** Automated (integration)
- **Acceptance criterion:** Regra de status: cliente inativo -> 403
- **Precondition:** Cliente cadastrado com `ativo=false`
- **Steps:**
  1. `POST /auth` com o CPF desse cliente
- **Expected result:** 403, `code: CLIENTE_INATIVO`

### TS-06: Autenticacao de staff (CPF + senha) com sucesso
- **Type:** Automated (integration)
- **Acceptance criterion:** Fluxo staff (RFC-0003) resolvido pela Lambda
- **Precondition:** Usuario staff ativo com CPF e senha (hash bcrypt) cadastrados
- **Steps:**
  1. `POST /auth` com `{ "cpf": "<cpf>", "senha": "<senha correta>" }`
  2. Verificar status 200 e `usuario.role` igual a role do usuario no banco (nao "cliente")
- **Expected result:** 200, JWT com a role real do staff (ADMIN/ATENDENTE/MECANICO/ESTOQUISTA)

### TS-07: Staff — senha ausente
- **Type:** Automated (unit)
- **Steps:**
  1. `POST /auth` com `{ "cpf": "<cpf staff>", "senha": "" }`
- **Expected result:** 400, `code: SENHA_AUSENTE`

### TS-08: Staff — usuario inexistente ou inativo
- **Type:** Automated (integration)
- **Steps:**
  1. `POST /auth` com CPF + senha de usuario nao cadastrado -> esperar 404 `USUARIO_NAO_ENCONTRADO`
  2. `POST /auth` com CPF + senha de usuario com `ativo=false` -> esperar 403 `USUARIO_INATIVO`
- **Expected result:** Codigos acima, sem revelar qual credencial especifica falhou

### TS-09: Staff — senha incorreta
- **Type:** Automated (integration)
- **Steps:**
  1. `POST /auth` com CPF de staff valido e senha errada
- **Expected result:** 403, `code: CREDENCIAIS_INVALIDAS` (mensagem generica, sem indicar se o CPF existe)

### TS-10: Segredo de assinatura via Secrets Manager
- **Type:** Manual/config
- **Acceptance criterion:** Segredo nunca hardcoded
- **Steps:**
  1. Inspecionar `src/infra/secrets.ts` e `src/config/env.ts` — confirmar que o segredo vem do AWS Secrets Manager (ou variavel de ambiente injetada em runtime), nunca literal no codigo
  2. `grep -r` no repo por padroes de segredo hardcoded (deve retornar vazio)
- **Expected result:** Nenhum segredo em texto plano no codigo-fonte

### TS-11: Logs estruturados sem vazar CPF completo
- **Type:** Automated (unit) / Manual
- **Acceptance criterion:** Logs JSON mascarando CPF
- **Steps:**
  1. Rodar `authHandler` com CPF valido e capturar a saida do `Logger`
  2. Verificar que o campo `cpf` no log usa `maskCpf` (formato `***.***.***-XX`)
- **Expected result:** CPF nunca aparece completo nos logs

### TS-12: Lambda Authorizer valida token emitido
- **Type:** Automated (unit)
- **Acceptance criterion:** Contrato do token consumido pelas rotas protegidas
- **Steps:**
  1. Gerar token via `authHandler` (fluxo cliente)
  2. Chamar `authorizerHandler` com header `Authorization: Bearer <token>`
  3. Chamar novamente sem header, e com `Bearer <token invalido/adulterado>`
- **Expected result:** `isAuthorized: true` + `context.{clienteId,role,cpf,nome}` no caso valido; `isAuthorized: false` nos demais, sem lancar excecao

### TS-13: Cold start e timeout / connection pooling (config)
- **Type:** Manual/config
- **Steps:**
  1. Revisar configuracao de timeout e memoria da Lambda no deploy (`infra`/console AWS)
  2. Revisar `src/container.ts` para confirmar reuso de conexao ao RDS entre invocacoes (fora do handler)
- **Expected result:** Timeout compativel com latencia do RDS; conexao nao recriada a cada invocacao

### TS-14: Dockerfile ou artefato de deploy documentado
- **Type:** Manual
- **Acceptance criterion:** Dockerfile (se empacotada como imagem) ou artefato de deploy documentado
- **Steps:**
  1. Verificar presenca de `Dockerfile` no repo `soat-fiap-oficina-auth-lambda` (se a Lambda for empacotada como imagem de container)
  2. Caso nao use imagem, confirmar que o artefato de deploy (zip/pacote) e o processo de build estao documentados no README
- **Expected result:** Dockerfile presente e funcional (build local) ou artefato de deploy alternativo claramente documentado

### TS-15: README do repo completo
- **Type:** Manual — ver tambem [f3-doc-05](../user-stories/f3-doc-05-readmes-por-repo.md)
- **Acceptance criterion:** README do repo: proposito, tecnologias, como testar/deployar, diagrama do fluxo
- **Steps:**
  1. Abrir o `README.md` de `soat-fiap-oficina-auth-lambda`
  2. Confirmar presenca de: proposito, tecnologias usadas, pre-requisitos, como testar localmente, como fazer deploy, diagrama do fluxo de autenticacao
- **Expected result:** README completo, cobrindo todos os itens acima

## Edge Cases
- `cpf` numerico (`123.456.789-09` sem digito verificador ou como number no JSON) — deve ser tratado por `normalizeCpf`/checagem de tipo
- Body em base64 (`event.isBase64Encoded=true`) — `parseBody` deve decodificar corretamente
- Body com JSON malformado — deve cair no `catch` de `parseBody` e resultar em `CPF_AUSENTE` (400), nao erro 500
- Falha de conexao com o RDS — deve retornar 500 `ERRO_INTERNO` com log de erro, nunca vazar stack trace ao cliente
- CPF valido de cliente mas enviado no fluxo staff (com senha) e vice-versa — usuario/cliente nao encontrado no repositorio certo

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| Function serverless em repositorio proprio | (estrutural — verificar `soat-fiap-oficina-auth-lambda`) |
| Endpoint recebe CPF no body | TS-01, TS-02 |
| Valida formato do CPF antes de consultar a base | TS-03 |
| Consulta existencia/status do cliente na base | TS-01, TS-04, TS-05 |
| Regras de status (404/403/422) | TS-03, TS-04, TS-05, TS-08, TS-09 |
| Gera JWT valido com claims corretas | TS-01, TS-06, TS-12 |
| Segredo via Secrets Manager | TS-10 |
| Fluxo staff resolvido pela Lambda | TS-06, TS-07, TS-08, TS-09 |
| Cold start / connection pooling | TS-13 |
| Logs estruturados sem vazar CPF | TS-11 |
| Testes unitarios de validacao/JWT/status | TS-01 a TS-09 (specs em `tests/`) |
| Dockerfile / artefato de deploy documentado | TS-14 |
| README do repo | TS-15 |

## Validation Checklist
- [ ] Todos os criterios de aceite cobertos
- [ ] Edge cases documentados
- [ ] Fluxos de erro documentados (400/403/404/422/500)
- [ ] Instrucoes de setup claras

## Useful Commands
```bash
# Testes unitarios
npm test

# Testes com cobertura
npm run test:cov

# Typecheck e lint (gates de CI)
npm run typecheck
npm run lint

# Invocar a Lambda localmente
npm run invoke:local

# Build da imagem e execucao via Docker
npm run docker:build
npm run docker:run
```
