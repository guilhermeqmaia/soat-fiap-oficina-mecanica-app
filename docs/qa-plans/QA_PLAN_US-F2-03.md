# QA Plan — US-F2-03: Adapter de Webhook para Notificacao de Mudanca de Status

## Summary
Valida o `WebhookNotificador` (outbound): envio de HTTP POST na mudanca de status da OS, assinatura HMAC (`X-Signature`), selecao de adapter via `NOTIFICATION_PROVIDER`, e a garantia de que falhas de entrega (timeout/4xx/5xx) nunca quebram o fluxo principal — este ultimo ponto e o de maior risco, pois observabilidade/notificacao nao pode derrubar negocio.

## Prerequisites
- Destino de teste (webhook.site, requestbin, ou mock HTTP local)
- Variaveis de ambiente: `NOTIFICATION_PROVIDER=webhook`, `NOTIFICATION_WEBHOOK_URL`, `NOTIFICATION_WEBHOOK_SECRET`, `NOTIFICATION_WEBHOOK_TIMEOUT_MS`
- Ferramenta para validar HMAC-SHA256 (ex.: script Node simples ou `openssl dgst -sha256 -hmac`)

## Test Scenarios

### TS-01: Webhook disparado na mudanca de status
- **Type:** Automated (integration) / Manual
- **Acceptance criterion:** Body inclui ordemId, clienteId, statusAnterior, statusAtual, timestamp, tipoNotificacao
- **Steps:**
  1. Provocar uma transicao de status de OS (ex.: diagnostico concluido)
  2. Inspecionar o POST recebido no destino de teste
- **Expected result:** Todos os campos do body presentes e corretos

### TS-02: Assinatura HMAC valida
- **Type:** Automated (unit)
- **Acceptance criterion:** Header X-Signature: sha256=<hmac> do body, usando NOTIFICATION_WEBHOOK_SECRET
- **Steps:**
  1. Capturar o body e o header `X-Signature` de uma chamada
  2. Recalcular o HMAC-SHA256 do body com o mesmo secret e comparar
- **Expected result:** Assinaturas identicas — permite ao destino validar autenticidade

### TS-03: Selecao de adapter via NOTIFICATION_PROVIDER
- **Type:** Automated (unit)
- **Steps:**
  1. Rodar com `NOTIFICATION_PROVIDER=mock` — confirmar que `MockEmailNotificador` e usado (sem chamada HTTP)
  2. Rodar com `NOTIFICATION_PROVIDER=webhook` — confirmar que `WebhookNotificador` e usado
- **Expected result:** Adapter correto injetado conforme a env, sem alterar o contrato de `Notificador`

### TS-04: Timeout de entrega nao quebra o fluxo principal
- **Type:** Automated (unit, com mock do HTTP client)
- **Acceptance criterion:** Erros de entrega nao quebram o fluxo principal, apenas logam
- **Steps:**
  1. Mockar o `HttpService` para nunca responder (simular timeout > `NOTIFICATION_WEBHOOK_TIMEOUT_MS`)
  2. Disparar a transicao de status que aciona a notificacao
- **Expected result:** A transicao de status da OS e persistida normalmente; o erro do webhook e apenas logado (ver US-F3-09 para o formato do log e a metrica de falha de integracao da US-F3-10/11)

### TS-05: Resposta 4xx/5xx do destino nao quebra o fluxo
- **Type:** Automated (unit)
- **Steps:**
  1. Mockar o destino respondendo 500 (ou 400)
  2. Disparar a transicao de status
- **Expected result:** Fluxo principal segue normalmente; falha registrada (log + metrica de integracao)

### TS-06: Retry simples com backoff (se implementado)
- **Type:** Automated (unit)
- **Acceptance criterion:** 1 tentativa adicional com backoff (opcional)
- **Steps:**
  1. Mockar falha na 1a tentativa e sucesso na 2a
- **Expected result:** Se o retry estiver implementado, a notificacao e entregue na 2a tentativa; se nao implementado, documentar como pendente no indice de QA Plans

### TS-07: .env.example atualizado
- **Type:** Manual
- **Steps:**
  1. Conferir `.env.example` com as 3 novas variaveis e um comentario/link de exemplo (webhook.site)
- **Expected result:** Documentado, facilitando reproducao local por outro desenvolvedor

### TS-08: README documenta o uso durante o video de demonstracao
- **Type:** Manual
- **Steps:**
  1. Conferir instrucoes no README sobre apontar `NOTIFICATION_WEBHOOK_URL` para um destino de teste na hora de gravar o video
- **Expected result:** Passo a passo claro para quem for gravar a demo

## Edge Cases
- `NOTIFICATION_WEBHOOK_SECRET` vazio/nao configurado — decidir e documentar: deve falhar no boot (fail-fast) ou apenas nao assinar (inseguro)?
- Destino retornando 200 mas com corpo de erro (falso-sucesso) — fora do escopo validar o corpo, mas documentar a limitacao
- Volume alto de transicoes de status em pouco tempo — confirmar que os disparos de webhook nao bloqueiam a thread principal (chamada assincrona/fire-and-forget com log, nao um `await` bloqueante no fluxo critico)

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| WebhookNotificador implements Notificador | TS-03 |
| Configuravel via env (URL/secret/timeout) | TS-01, TS-02, TS-04 |
| Selecao via NOTIFICATION_PROVIDER | TS-03 |
| Body com os campos exigidos | TS-01 |
| Header X-Signature (HMAC) | TS-02 |
| Erros de entrega nao quebram o fluxo | TS-04, TS-05 |
| Retry simples (opcional) | TS-06 |
| .env.example atualizado | TS-07 |
| Teste unitario (sucesso, timeout, 5xx) | TS-04, TS-05 |
| README documenta uso na demo | TS-08 |

## Validation Checklist
- [ ] Todos os criterios de aceite cobertos
- [ ] Edge cases documentados
- [ ] Isolamento de falha (webhook nunca derruba negocio) comprovado por teste, nao so por leitura de codigo
- [ ] Instrucoes de setup claras

## Useful Commands
```bash
npm run test:unit
npx jest webhook-notificador --verbose
```

## Nota (backfill — US-F3-DOC-07)
QA Plan criado retroativamente com prioridade alta: e a integracao externa com maior risco de efeito cascata (uma falha de rede num servico terceiro nao pode derrubar a abertura/andamento de uma OS), e alimenta diretamente a metrica/alerta de "falha de notificacao" da US-F3-10/11.
