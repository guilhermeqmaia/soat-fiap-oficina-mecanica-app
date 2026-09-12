# QA Plan — US-F3-02: API Gateway e Protecao de Rotas Sensiveis

## Resumo
Valida o AWS API Gateway (HTTP API, stage `gateway/` do repo infra-k8s) como **unica entrada publica**: rota `/auth` na Lambda, Lambda Authorizer nas rotas sensiveis, rotas publicas explicitas, throttling, roteamento por VPC Link ate o NLB interno do EKS, CORS e access logs.

## Pre-requisitos
- Ambiente no ar (`scripts/aws-deploy-all.sh`); `GW` = URL impressa pelo script (`https://<id>.execute-api.us-east-1.amazonaws.com`)
- Seeds carregados; tokens de TS-04/TS-05 do QA_PLAN_US-F3-01
- `aws` CLI (profile `oficina`), `curl`, `jq`, `k6` (throttling)

## Cenarios de Teste

### TS-01: Gateway provisionado por Terraform e e o unico endpoint publico
- **Tipo:** Manual
- **Criterio:** API Gateway por Terraform como ponto de entrada unico
- **Passos:**
  1. `aws apigatewayv2 get-apis --query 'Items[].[Name,ApiEndpoint,ProtocolType]'`
  2. `aws elbv2 describe-load-balancers --query 'LoadBalancers[].[Scheme,DNSName]'`
  3. `aws ec2 describe-instances --query 'Reservations[].Instances[].PublicIpAddress'`
- **Resultado esperado:** 1 HTTP API; o unico LB e `internal`; nenhuma instancia com IP publico; o run `apply (gateway)` do `cd.yml` e a origem (17 recursos)

### TS-02: `POST /auth` chega na Lambda
- **Tipo:** Ambos
- **Criterio:** Rota publica de autenticacao integrada a Lambda
- **Passos:**
  1. `curl -s -X POST $GW/auth -H 'content-type: application/json' -d '{"cpf":"11111111111"}' -w ' -> %{http_code}'`
- **Resultado esperado:** `422 CPF_INVALIDO` com `requestId` do gateway — resposta veio da Lambda, sem authorizer

### TS-03: Rotas sensiveis exigem JWT valido (Lambda Authorizer)
- **Tipo:** Ambos
- **Criterio:** Rotas sensiveis protegidas; mecanismo = Lambda Authorizer
- **Passos:**
  1. `curl -s $GW/clientes -w ' -> %{http_code}'` (sem token)
  2. `curl -s $GW/clientes -H 'Authorization: Bearer abc.def.ghi' -w ' -> %{http_code}'`
  3. `curl -s $GW/clientes -H "Authorization: Bearer $TOKEN_ADMIN" -w ' -> %{http_code}'`
- **Resultado esperado:** `401 {"message":"Unauthorized"}` (gateway, sem header) · `403` (authorizer nega) · `200` com a lista
- **Evidencia (12/09/2026):** 401 / 403 / 200 respectivamente; `aws apigatewayv2 get-authorizers --api-id <id>` mostra o authorizer REQUEST apontando para `oficina-auth-prod:prod`

### TS-04: Rotas publicas liberadas explicitamente
- **Tipo:** Ambos
- **Criterio:** Rotas publicas (status de OS, `/health`)
- **Passos:**
  1. `curl -s $GW/health` e `curl -s $GW/health/ready` -> 200
  2. Abrir uma OS (QA_PLAN_US-F3-06) e chamar `curl -s "$GW/ordens-servico/numero/<numero>/status"` sem token -> 200
  3. `aws apigatewayv2 get-routes --api-id <id> --query 'Items[].[RouteKey,AuthorizerId]'`
- **Resultado esperado:** somente `GET /health`, `GET /health/ready`, `GET /ordens-servico/numero/{numero}/status` e os 3 webhooks de aprovacao sem `AuthorizerId`; o catch-all `ANY /{proxy+}` com authorizer

### TS-05: Throttling / rate limiting
- **Tipo:** Ambos
- **Criterio:** Throttling configurado no gateway
- **Passos:**
  1. `aws apigatewayv2 get-stage --api-id <id> --stage-name '$default' --query 'DefaultRouteSettings'`
  2. Rajada acima do burst: `k6 run perf/spike.js -e BASE_URL=$GW -e JWT_SECRET=<segredo> -e VUS=900 -e DURATION=30s`
- **Resultado esperado:** `ThrottlingRateLimit 400`, `ThrottlingBurstLimit 800`; sob a rajada aparecem `429` no gateway (access log `status: 429`) e o backend nao recebe o excedente

### TS-06: Roteamento ao EKS por VPC Link
- **Tipo:** Manual
- **Criterio:** Roteamento para o Service do EKS
- **Passos:**
  1. `aws apigatewayv2 get-vpc-links --query 'Items[].[VpcLinkStatus,SubnetIds,SecurityGroupIds]'`
  2. `aws apigatewayv2 get-integrations --api-id <id> --query 'Items[].[IntegrationType,ConnectionType,IntegrationUri]'`
  3. `for i in $(seq 1 10); do curl -s -o /dev/null -w '%{http_code} %{time_total}\n' $GW/health; done`
- **Resultado esperado:** VPC Link `AVAILABLE` nas subnets privadas; integracao `HTTP_PROXY` + `VPC_LINK` com o ARN do listener do NLB (`backend_listener_arn`); 10/10 `200` em < 1 s (evidencia: ~0,44 s)

### TS-07: CORS para as UIs
- **Tipo:** Ambos
- **Criterio:** CORS configurado
- **Passos:**
  1. `curl -s -i -X OPTIONS $GW/clientes -H 'Origin: http://localhost:5173' -H 'Access-Control-Request-Method: GET' | grep -i access-control`
- **Resultado esperado:** `access-control-allow-origin`, `-methods` e `-headers` (incluindo `authorization`) presentes; `aws apigatewayv2 get-api --api-id <id> --query CorsConfiguration` confere

### TS-08: Access logs exportados
- **Tipo:** Manual
- **Criterio:** Logs de acesso habilitados e exportados
- **Passos:**
  1. Executar TS-03
  2. `aws logs tail /aws/apigateway/oficina-mecanica-gateway --since 5m`
- **Resultado esperado:** uma linha JSON por requisicao com `requestId`, `routeKey`, `status`, `latencyMs`, `authorizerError`, `integrationError` — campos consumidos pelo painel de borda (US-F3-10)

### TS-09: Diagrama e README
- **Tipo:** Manual
- **Criterio:** Diagrama de sequencia; README com a URL publica
- **Passos:**
  1. Conferir `docs/arquitetura/` (diagramas, US-F3-DOC-03) e o README do repo infra-k8s (secao CI/CD: "Deploy ativo" = output `api_base_url`)
- **Resultado esperado:** diagrama `cliente -> API Gateway -> Lambda -> JWT -> API protegida` presente; README explica como obter a URL (ambiente efemero — ADR-0008)

## Casos de Borda
- Token expirado (`exp` no passado) -> 403 no authorizer (cache do authorizer de 300 s pode manter uma decisao por ate 5 min — documentado)
- Metodo nao mapeado numa rota publica (ex.: `POST /health`) -> cai no catch-all protegido -> 401
- Payload > 10 MB / timeout de integracao (30 s) -> 413/504 do gateway
- Primeiras requisicoes apos o deploy podem dar 503 enquanto os alvos do NLB convergem (~1 min) — o script de deploy aguarda

## Rastreabilidade

| Criterio de Aceite | Cenarios |
|---|---|
| API Gateway por Terraform, entrada unica | TS-01 |
| `/auth` integrado a Lambda | TS-02 |
| Rotas sensiveis exigem JWT | TS-03 |
| Lambda Authorizer | TS-03 |
| Rotas publicas explicitas | TS-04 |
| Throttling | TS-05 |
| Roteamento ao EKS | TS-06 |
| CORS | TS-07 |
| Access logs exportados | TS-08 |
| Diagrama de sequencia | TS-09 |
| README com URL | TS-09 |

## Checklist de Validacao
- [x] Todos os criterios cobertos
- [x] Casos de borda documentados
- [x] Fluxos de erro documentados
- [x] Instrucoes de setup claras

## Comandos Uteis
```bash
API=$(aws apigatewayv2 get-apis --query 'Items[0].ApiId' --output text)
aws apigatewayv2 get-routes --api-id $API --query 'Items[].[RouteKey,AuthorizerId]' --output table
aws logs tail /aws/apigateway/oficina-mecanica-gateway --since 10m --format short
```
