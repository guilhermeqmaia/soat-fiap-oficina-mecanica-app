# QA Plan — US-F3-01: Function Serverless de Autenticacao por CPF

## Resumo
Valida a Lambda `oficina-auth-prod` (repo `soat-fiap-oficina-auth-lambda`) como **unico emissor de JWT**: validacao de CPF, consulta ao RDS, regras de status (404/403/422), claims do token, segredo no Secrets Manager, fluxo staff (CPF + senha), logs mascarados e testes automatizados. Os cenarios de ponta a ponta passam pelo API Gateway (`POST /auth`), que e o unico caminho publico.

## Pre-requisitos
- Ambiente no ar: `scripts/aws-deploy-all.sh` (repo infra-k8s) — imprime a URL do gateway (`GW`) e carrega os seeds de teste
- Seeds: `prisma/seeds/01_test_data.sql` (clientes) e `03_test_users.sql` (staff) aplicados
- `aws` CLI com o profile `oficina`; `jq`
- Dados de teste: cliente CPF `39053344705` (Joao da Silva), CPF valido inexistente `12345678909`, admin CPF `52998224725` / `admin123`, mecanico `16899535009` / `mecanico123`

## Cenarios de Teste

### TS-01: CPF com formato invalido e rejeitado antes do banco
- **Tipo:** Ambos
- **Criterio:** Valida o formato do CPF (digitos verificadores); CPF invalido -> 422
- **Passos:**
  1. `curl -s -X POST $GW/auth -H 'content-type: application/json' -d '{"cpf":"11111111111"}' -w ' -> %{http_code}'`
- **Resultado esperado:** `422` com `{"error":"CPF_INVALIDO", ...}`; nenhuma consulta ao banco (log da Lambda sem `query`)
- **Resultado alternativo (erro):** 200 ou 404 indicam validacao ausente/ordem errada

### TS-02: Cliente inexistente -> 404
- **Tipo:** Ambos
- **Criterio:** Consulta a existencia do cliente; inexistente -> 404
- **Passos:**
  1. `POST /auth` com `{"cpf":"12345678909"}` (CPF valido, sem cadastro)
- **Resultado esperado:** `404` `{"error":"CLIENTE_NAO_ENCONTRADO"}`

### TS-03: Cliente inativo/bloqueado -> 403
- **Tipo:** Manual
- **Criterio:** Regras de status: inativo/bloqueado -> 403
- **Pre-condicao:** `CLIENTE_STATUS_COLUMN` configurada na Lambda (var do CI) e um cliente com a coluna de status = inativo
- **Passos:**
  1. Marcar um cliente como inativo (`UPDATE cliente SET <coluna> = false WHERE cpf_cnpj = '11144477735'`) via `kubectl -n oficina exec deploy/oficina-app -c app -- npx prisma db execute --stdin`
  2. `POST /auth` com esse CPF
- **Resultado esperado:** `403` `{"error":"CLIENTE_INATIVO"}`
- **Resultado alternativo:** sem a coluna configurada todo cliente encontrado e considerado ativo (documentado no README da Lambda)

### TS-04: Cliente valido recebe JWT com as claims exigidas
- **Tipo:** Ambos
- **Criterio:** Gera JWT valido (`sub`, `cpf`, `role`, `iss`, `exp`) assinado com segredo compartilhado
- **Passos:**
  1. `TOKEN=$(curl -s -X POST $GW/auth -H 'content-type: application/json' -d '{"cpf":"39053344705"}' | jq -r .accessToken)`
  2. Decodificar o payload: `echo $TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | jq .`
- **Resultado esperado:** `200`; payload com `sub` = id do cliente (`11111111-...`), `cpf`, `role: "CLIENTE"`, `iss: "oficina-auth-lambda"`, `exp` ~1h a frente
- **Evidencia (12/09/2026):** token de 305 chars, claims conforme acima, aceito pela app (`GET /clientes/39053344705/ordens-servico` -> 200)

### TS-05: Staff autentica com CPF + senha e recebe a role
- **Tipo:** Ambos
- **Criterio:** Decisao de auth de staff conforme a RFC — a Lambda cobre o fluxo `{cpf, senha}`
- **Passos:**
  1. `POST /auth` com `{"cpf":"52998224725","senha":"admin123"}` -> 200, `role: "ADMIN"`
  2. `POST /auth` com `{"cpf":"52998224725","senha":"errada"}` -> 403
  3. `POST /auth` com `{"cpf":"16899535009","senha":"mecanico123"}` -> 200, `role: "MECANICO"`, `sub` = id do usuario
- **Resultado esperado:** conforme cada passo; a mesma function atende cliente (sem senha) e staff

### TS-06: Segredo de assinatura vem do Secrets Manager
- **Tipo:** Manual
- **Criterio:** Segredo via AWS Secrets Manager (nunca hardcoded)
- **Passos:**
  1. `aws lambda get-function-configuration --function-name oficina-auth-prod --query 'Environment.Variables'`
  2. `aws secretsmanager describe-secret --secret-id oficina-auth-prod/jwt`
- **Resultado esperado:** a env contem apenas `JWT_SECRET_ID` (ARN), nunca o valor; o secret existe e e o mesmo referenciado pelo app (`JWT_SECRET_ID` no CD do app); `grep -rn "JWT_SECRET\s*=" src/` na Lambda nao encontra literal

### TS-07: Conexao ao RDS reaproveitada, timeout e cold start
- **Tipo:** Manual
- **Criterio:** Cold start e timeout adequados; pooling
- **Passos:**
  1. `aws lambda get-function-configuration --function-name oficina-auth-prod --query '[Timeout,MemorySize,VpcConfig.SubnetIds]'`
  2. Disparar 10 chamadas seguidas de `POST /auth` e medir `%{time_total}`
- **Resultado esperado:** timeout 15 s / 512 MB, function na VPC (subnets privadas); 1a chamada (cold) < 3 s, seguintes < 300 ms (pool reutilizado — `pg.Pool` fora do handler)

### TS-08: Logs estruturados sem CPF completo
- **Tipo:** Manual
- **Criterio:** Logs JSON, CPF mascarado
- **Passos:**
  1. Executar TS-04
  2. `aws logs tail /aws/lambda/oficina-auth-prod --since 5m --format short`
- **Resultado esperado:** linhas JSON (`level`, `msg`, `requestId`); CPF aparece mascarado (`390.***.***-05` ou equivalente); nenhum token no log

### TS-09: Testes automatizados e contrato do token
- **Tipo:** Automatizado
- **Criterio:** Testes unitarios + contrato do payload
- **Passos:**
  1. No repo da Lambda: `npm ci && npm run test:cov`
- **Resultado esperado:** suites verdes (validacao de CPF, geracao de JWT, cenarios 404/403/422, contrato das claims); cobertura >= 80%; o `cd.yml` so promove o alias apos smoke test (`422` para CPF invalido)

### TS-10: Artefato de deploy e README
- **Tipo:** Manual
- **Criterio:** Artefato documentado; README com proposito, como testar/deployar e diagrama
- **Passos:**
  1. `npm run package` gera `lambda.zip`; `infra.yml` (Terraform) e `cd.yml` (publish-version + alias) documentados no README secao 6
- **Resultado esperado:** README cobre proposito, tecnologias, testes, deploy e diagrama do fluxo

## Casos de Borda
- CPF com pontuacao (`390.533.447-05`) — normalizado antes da validacao
- CNPJ (14 digitos) de cliente PJ (`11222333000181`) — aceito/recusado conforme a RFC (documentar)
- Body vazio / JSON invalido -> 400/422, nunca 500
- Segredo rotacionado no Secrets Manager: a Lambda le no cold start; o app tambem — ambos precisam de rollout

## Rastreabilidade

| Criterio de Aceite | Cenarios |
|---|---|
| Function serverless em repo proprio | TS-10 |
| `POST /auth` recebe CPF no body | TS-01, TS-04 |
| Valida formato do CPF antes do banco | TS-01 |
| Consulta existencia e status no RDS | TS-02, TS-03 |
| 404 / 403 / 422 | TS-02, TS-03, TS-01 |
| JWT com claims `sub`, `cpf`, `role`, `iss`, `exp` | TS-04, TS-05 |
| Segredo via Secrets Manager | TS-06 |
| Auth de staff conforme RFC | TS-05 |
| Cold start / timeout / pooling | TS-07 |
| Logs JSON com CPF mascarado | TS-08 |
| Testes unitarios + contrato | TS-09 |
| Artefato de deploy documentado | TS-10 |
| README | TS-10 |

## Checklist de Validacao
- [x] Todos os criterios cobertos
- [x] Casos de borda documentados
- [x] Fluxos de erro (422/404/403) documentados
- [x] Instrucoes de setup claras

## Comandos Uteis
```bash
# repo soat-fiap-oficina-auth-lambda
npm run test:cov
aws lambda invoke --function-name oficina-auth-prod:prod --cli-binary-format raw-in-base64-out \
  --payload '{"body":"{\"cpf\":\"11111111111\"}"}' /dev/stdout
```
