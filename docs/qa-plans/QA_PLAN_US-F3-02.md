# QA Plan — US-F3-02: API Gateway e Protecao de Rotas Sensiveis

## Summary
Valida o AWS API Gateway (`soat-fiap-oficina-infra-k8s/gateway`, Terraform) como ponto de entrada unico: rota publica `/auth` integrada a Lambda, rotas sensiveis protegidas pelo Lambda Authorizer (JWT), rotas publicas do backend liberadas, throttling, CORS e roteamento para o backend no EKS via VPC Link.

## Prerequisites
- Terraform 1.9.8 instalado; acesso as credenciais AWS (para `plan`/`apply` reais) ou apenas `init -backend=false` para validacao estrutural
- Lambda de autenticacao ja deployada (`auth_lambda_arn` disponivel) — ver [QA_PLAN_US-F3-01](QA_PLAN_US-F3-01.md)
- NLB interno do backend no EKS no ar (`backend_listener_arn`) — ver [QA_PLAN_US-F3-06](QA_PLAN_US-F3-06.md) (US-F3-06)
- `curl`/Postman e um JWT valido (obtido via `POST {gateway}/auth`) e um invalido/expirado para os testes negativos

## Test Scenarios

### TS-01: Terraform valida e formata sem erros
- **Type:** Automated (CI)
- **Acceptance criterion:** API Gateway provisionado por Terraform
- **Steps:**
  1. `terraform -chdir=gateway fmt -check -diff`
  2. `terraform -chdir=gateway init -backend=false -input=false`
  3. `terraform -chdir=gateway validate`
- **Expected result:** Todos os comandos retornam sucesso (mesmo gate do `ci.yml`)

### TS-02: Rota publica de autenticacao roteia para a Lambda
- **Type:** Manual / Automated (smoke pos-deploy)
- **Acceptance criterion:** Rota publica `/auth` integrada a Lambda de CPF
- **Steps:**
  1. `curl -X POST {gateway_url}/auth -d '{"cpf":"<cpf válido>"}' -H "Content-Type: application/json"`
- **Expected result:** Resposta identica ao contrato da Lambda (200 com JWT, ou erro 400/403/404/422 conforme o caso) — sem exigir Authorization

### TS-03: Rota sensivel exige JWT valido
- **Type:** Manual / Automated (smoke)
- **Acceptance criterion:** Rotas sensiveis exigem JWT valido; mecanismo de protecao (Lambda Authorizer)
- **Steps:**
  1. Chamar uma rota sensivel (ex.: `GET /clientes`) sem header `Authorization`
  2. Chamar a mesma rota com `Authorization: Bearer <token invalido>`
  3. Chamar com `Authorization: Bearer <token valido>`
- **Expected result:** 401/403 nos dois primeiros casos (authorizer nega); 200 (ou o status do backend) no terceiro

### TS-04: Rotas publicas do backend liberadas sem token
- **Type:** Manual / Automated (smoke)
- **Acceptance criterion:** Rotas publicas explicitamente liberadas (health, status de OS, webhooks)
- **Steps:**
  1. `curl {gateway_url}/health` sem token
  2. `curl {gateway_url}/ordens-servico/status/{numero}` sem token (consulta publica de status)
- **Expected result:** 200, sem exigir Authorization — confirma que `local.public_backend_route_keys` cobre exatamente essas rotas

### TS-05: Catch-all protegido nao vaza rota nao mapeada
- **Type:** Manual
- **Acceptance criterion:** Rotas sensiveis protegidas por padrao
- **Steps:**
  1. Chamar uma rota qualquer nao listada como publica (ex.: `GET /produtos`) sem token
- **Expected result:** Negada pelo authorizer (401/403) — comprova que o padrao e "protegido", nao "liberado por omissao"

### TS-06: Throttling / rate limiting
- **Type:** Manual/config
- **Acceptance criterion:** Throttling configurado no gateway
- **Steps:**
  1. Inspecionar `gateway.tf`/`variables.tf` para o `throttle_burst_limit`/`throttle_rate_limit` configurado no stage
  2. (Opcional, carga) Disparar rajada de requisicoes acima do limite configurado
- **Expected result:** Configuracao presente no Terraform; em teste de carga, requisicoes excedentes recebem 429

### TS-07: CORS configurado para as UIs
- **Type:** Manual
- **Acceptance criterion:** CORS configurado
- **Steps:**
  1. `curl -X OPTIONS {gateway_url}/auth -H "Origin: <origem da UI>" -H "Access-Control-Request-Method: POST"`
- **Expected result:** Resposta com headers `Access-Control-Allow-Origin`/`-Methods` cobrindo as origens das UIs admin/cliente

### TS-08: Roteamento para o backend via VPC Link
- **Type:** Manual / Automated (smoke)
- **Acceptance criterion:** Roteamento do gateway para o Service/Ingress do EKS
- **Steps:**
  1. Confirmar em `gateway.tf` que `aws_apigatewayv2_vpc_link.eks` aponta para o NLB interno correto
  2. Chamar uma rota protegida com token valido de ponta a ponta e confirmar que a resposta vem da aplicacao (ex.: payload/versao conhecida)
- **Expected result:** Requisicao chega ao pod da aplicacao no EKS

### TS-09: Logs de acesso do gateway habilitados
- **Type:** Manual/config
- **Acceptance criterion:** Logs de acesso exportados para observabilidade
- **Steps:**
  1. Verificar configuracao de access logs do stage no Terraform/console AWS
  2. Confirmar que os logs alimentam o pipeline de observabilidade (US-F3-10)
- **Expected result:** Access logs habilitados e visiveis na plataforma de observabilidade escolhida

### TS-10: README documenta a URL publica do gateway
- **Type:** Manual
- **Acceptance criterion:** Documentado no README com a URL publica do gateway
- **Steps:**
  1. Abrir o README do repo `soat-fiap-oficina-infra-k8s` (secao do gateway)
  2. Confirmar presenca da URL publica do gateway (ou placeholder claro, se ainda nao implantado)
- **Expected result:** README documenta a URL publica do gateway, atualizada

## Edge Cases
- Token expirado (`exp` no passado) chegando na rota sensivel -> negado
- Header `Authorization` sem prefixo `Bearer` -> `extractBearerToken` deve tratar (ver testes da Lambda) e o authorizer deve negar se malformado
- Rota `/auth` chamada com metodo diferente de POST (ex.: GET) -> deve retornar erro de metodo nao suportado, nao cair no catch-all protegido
- Cache do authorizer (`authorizer_cache_ttl_seconds`) mascarando revogacao — usuario desativado ainda acessa até o TTL expirar

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| API Gateway provisionado por Terraform | TS-01 |
| Rota publica /auth integrada a Lambda | TS-02 |
| Rotas sensiveis exigem JWT valido | TS-03, TS-05 |
| Mecanismo Lambda Authorizer | TS-03, TS-05 |
| Rotas publicas explicitamente liberadas | TS-04 |
| Throttling / rate limiting | TS-06 |
| Roteamento para o Service/Ingress do EKS | TS-08 |
| CORS configurado | TS-07 |
| Logs de acesso exportados | TS-09 |
| Diagrama de sequencia do fluxo | (verificar em [f3-doc-03](../user-stories/f3-doc-03-arquitetura-diagramas.md)) |
| Documentado no README com a URL publica do gateway | TS-10 |

## Validation Checklist
- [ ] Todos os criterios de aceite cobertos
- [ ] Edge cases documentados
- [ ] Fluxos de erro documentados
- [ ] Instrucoes de setup claras

## Useful Commands
```bash
# Validacao estrutural (sem AWS)
terraform -chdir=gateway fmt -check -diff
terraform -chdir=gateway init -backend=false -input=false
terraform -chdir=gateway validate

# Plan real (com credenciais AWS configuradas)
terraform -chdir=gateway plan

# Smoke test pos-deploy
curl {gateway_url}/health
curl -X POST {gateway_url}/auth -d '{"cpf":"<cpf>"}' -H "Content-Type: application/json"
curl {gateway_url}/clientes -H "Authorization: Bearer <token>"
```
