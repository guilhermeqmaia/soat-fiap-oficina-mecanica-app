# QA Plan — US-F4-05: API Gateway Multi-servico e Webhook Publico do Mercado Pago

## Resumo
Valida o stage `gateway/` do infra-k8s apos a US-F4-05: um NLB interno unico com um listener/target group (NodePort) por servico, integracoes e rotas por prefixo (OS, Billing, Execucao), rotas publicas por servico (inclui `POST /webhooks/mercadopago`), catch-all protegido para o OS Service e authorizer da Lambda inalterado.

## Pre-requisitos
- Terraform >= 1.9; para apply/plan real: cluster no ar (data source do node group), vars `VPC_ID`, `EKS_CLUSTER_NAME`, `VPC_LINK_*`, `AUTH_LAMBDA_ARN`
- Servicos deployados com Service NodePort 30080/30081/30082 (overlay k8s-aws)

## Cenarios de Teste

### TS-01: fmt + validate
- **Tipo:** Automatizado
- **Criterio:** Configuracao valida
- **Passos:** `cd gateway && terraform fmt -check && terraform init -backend=false && terraform validate`
- **Resultado esperado:** valido (CI verde)

### TS-02: NLB unico com um target group por servico
- **Tipo:** Manual (apos apply)
- **Criterio:** Um NLB interno gerenciado pelo Terraform
- **Passos:** `terraform output service_listeners`; `aws elbv2 describe-target-health --target-group-arn <tg do billing>`
- **Resultado esperado:** 3 listeners (3000/3001/3002); targets = nodes do node group, `healthy` quando o servico responde `/health` no NodePort

### TS-03: Roteamento por prefixo
- **Tipo:** Manual
- **Criterio:** Rotas por prefixo para cada servico
- **Passos:** com token valido: `GET $GW/orcamentos` (Billing), `GET $GW/catalogo/servicos` (Execucao), `GET $GW/clientes` (OS)
- **Resultado esperado:** cada chamada chega ao servico certo (log `service=` no pino de cada um); 404 do servico para rota inexistente dentro do prefixo

### TS-04: Webhook do Mercado Pago publico, validado no servico
- **Tipo:** Manual
- **Criterio:** `POST /webhooks/mercadopago` sem authorizer
- **Passos:** `curl -X POST $GW/webhooks/mercadopago -d '{}'` sem token
- **Resultado esperado:** nao e 401 do gateway; o Billing responde 401/400 por assinatura invalida (US-F4-09)

### TS-05: Rotas protegidas continuam exigindo JWT
- **Tipo:** Manual
- **Criterio:** Authorizer inalterado
- **Passos:** `GET $GW/orcamentos` sem token; `GET $GW/execucao` com token de issuer errado
- **Resultado esperado:** 401 em ambos, emitido pelo gateway (access log com `authorizerError`)

### TS-06: Catch-all para o OS Service
- **Tipo:** Manual
- **Criterio:** Compatibilidade com rotas ainda no monolito
- **Passos:** `GET $GW/produtos` com token (rota que ainda vive no monolito ate a US-F4-06)
- **Resultado esperado:** atendida pelo OS Service

### TS-07: Transicao Fase 3 -> 4
- **Tipo:** Manual
- **Criterio:** `backend_listener_arn` opcional
- **Passos:** aplicar com `backend_listener_arn` preenchido (NLB do Service da Fase 3) e depois vazio
- **Resultado esperado:** rotas do OS funcionam nos dois modos; Billing/Execucao sempre pelo NLB unico

### TS-08: Swagger nao exposto
- **Tipo:** Manual
- **Criterio:** `/api` interno
- **Passos:** `GET $GW/api` e `GET $GW/orcamentos/api`
- **Resultado esperado:** 401 (catch-all protegido) / 404 — nunca a UI do Swagger sem token

## Casos de Borda
- Node sem pod do servico X: health check HTTP falha para esse node no TG de X (NodePort sem endpoint local responde 503/conexao recusada) — trafego vai para os nodes saudaveis
- Prefixo novo (4o servico): adicionar em `var.services` + NodePort no overlay — sem tocar nas rotas existentes

## Rastreabilidade
| Criterio | Cenarios |
|---|---|
| Rotas por prefixo | TS-03, TS-06 |
| Um NLB interno com listener por servico | TS-02 |
| Webhook MP publico | TS-04 |
| Authorizer/CORS/throttling mantidos | TS-05 |
| `/api` interno | TS-08 |
| Outputs e smoke | TS-02 (outputs); smoke do `aws-deploy-all.sh` em `/health` |

## Checklist de Validacao
- [x] TS-01 (20/10/2026)
- [ ] TS-02..TS-08 — proximo ciclo de deploy (apos US-F4-06 mudar o Service do OS para NodePort)
