# QA Plan — US-F2-02: Webhook de Aprovacao de Orcamento (Notificacao Externa)

## Summary
Valida o endpoint inbound `POST /webhooks/ordens-servico/:id/aprovacao`: autenticacao por `X-Webhook-Token` (nao JWT), reaproveitamento da logica de aprovar/reprovar orcamento, e os contratos de erro (401 token invalido, 409 status invalido da OS). Alto risco por ser um endpoint publico (`@Public()`) com sua propria superficie de autenticacao.

## Prerequisites
- `WEBHOOK_APPROVAL_TOKEN` configurado no ambiente de teste
- OS em `AGUARDANDO_APROVACAO` para os testes de sucesso
- Cliente HTTP (curl/Postman) para simular a chamada de um sistema externo

## Test Scenarios

### TS-01: Aprovacao via webhook com token valido
- **Type:** Automated (e2e)
- **Acceptance criterion:** aprovado=true reaproveita service.aprovarOrcamento; resposta 200
- **Precondition:** OS em AGUARDANDO_APROVACAO
- **Steps:**
  1. `POST /webhooks/ordens-servico/:id/aprovacao` com `{ "aprovado": true }` e header `X-Webhook-Token: <token válido>`
- **Expected result:** 200, OS com status atualizado (`EM_EXECUCAO`), mesmo efeito da US-13 TS-01

### TS-02: Recusa via webhook com motivo
- **Type:** Automated (e2e)
- **Acceptance criterion:** aprovado=false reaproveita service.reprovarOrcamento(id, motivo)
- **Steps:**
  1. `POST /webhooks/ordens-servico/:id/aprovacao` com `{ "aprovado": false, "motivo": "cliente desistiu" }` e token valido
- **Expected result:** 200, OS `CANCELADA`, mesmo efeito da US-13 TS-02 (estorno de estoque incluso)

### TS-03: Token ausente ou invalido
- **Type:** Automated (e2e)
- **Acceptance criterion:** 401 quando token invalido/ausente
- **Steps:**
  1. Chamar o endpoint sem o header `X-Webhook-Token`
  2. Chamar com um token incorreto
- **Expected result:** 401 nos dois casos, sem processar a decisao

### TS-04: OS fora do status AGUARDANDO_APROVACAO
- **Type:** Automated (e2e)
- **Acceptance criterion:** 409 quando OS nao esta em AGUARDANDO_APROVACAO
- **Steps:**
  1. Chamar o webhook para uma OS em `RECEBIDA` ou `EM_EXECUCAO`
- **Expected result:** 409, mesmo com token valido

### TS-05: Endpoint publico mas nao aberto (guard proprio)
- **Type:** Automated (unit/e2e)
- **Acceptance criterion:** Marcado @Public() mas protegido por guard proprio
- **Steps:**
  1. Confirmar que o endpoint nao exige JWT (`@Public()`)
  2. Confirmar que, mesmo assim, uma chamada sem `X-Webhook-Token` e negada (TS-03) — ou seja, "publico" aqui significa "fora do JwtAuthGuard", nao "sem autenticacao nenhuma"
- **Expected result:** Comportamento correto de guard dedicado coexistindo com `@Public()`

### TS-06: Swagger documenta o endpoint na tag Webhooks
- **Type:** Manual
- **Steps:**
  1. Abrir o Swagger e localizar a tag `Webhooks`
- **Expected result:** Endpoint documentado separadamente dos endpoints autenticados por JWT

### TS-07: Body invalido
- **Type:** Automated (unit)
- **Steps:**
  1. `POST` com body sem o campo `aprovado`, ou com `aprovado` nao-booleano
- **Expected result:** 400 de validacao, nao 500

## Edge Cases
- Chamada duplicada do mesmo webhook (sistema externo reenviando por timeout) — segunda chamada deve cair no caso "OS fora do status" (409), nao reprocessar
- `WEBHOOK_APPROVAL_TOKEN` alterado em runtime sem reiniciar a app — comportamento deve ser previsivel (documentar se exige restart)
- Payload com `motivo` muito longo — validar limite de tamanho, se houver

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| Endpoint POST /webhooks/ordens-servico/:id/aprovacao | TS-01, TS-02 |
| @Public() + guard proprio (X-Webhook-Token) | TS-03, TS-05 |
| aprovado=true -> aprovarOrcamento | TS-01 |
| aprovado=false -> reprovarOrcamento | TS-02 |
| 401 token invalido/ausente | TS-03 |
| 409 status invalido | TS-04 |
| Testes e2e (aprovacao, recusa, token invalido, status invalido) | TS-01 a TS-04 |
| Swagger com tag Webhooks | TS-06 |

## Validation Checklist
- [ ] Todos os criterios de aceite cobertos
- [ ] Edge cases documentados (replay/duplicacao do webhook)
- [ ] Fluxos de erro documentados
- [ ] Instrucoes de setup claras

## Useful Commands
```bash
npm run test:integration
npx jest webhook --verbose
curl -X POST {app_url}/webhooks/ordens-servico/{id}/aprovacao \
  -H "X-Webhook-Token: $WEBHOOK_APPROVAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"aprovado": true}'
```

## Nota (backfill — US-F3-DOC-07)
QA Plan criado retroativamente com prioridade alta: e um endpoint publico com autenticacao propria (nao JWT), superficie de ataque diferente do resto da API e integracao critica para o fluxo de aprovacao funcionar sem depender do cliente logado.
