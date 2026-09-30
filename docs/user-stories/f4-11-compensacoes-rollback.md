# US-F4-11: Compensacoes e Rollback Seguro da Saga

**User Story:** Como Sistema, quero que qualquer falha em qualquer passo da saga dispare as compensacoes corretas (liberar reservas, cancelar orcamento, estornar pagamento, cancelar OS), para que nenhuma OS fique num estado inconsistente entre os servicos.

**Prioridade:** Alta
**Story Points:** 8
**Status:** To Do
**DDD Domain:** Atendimento + Execucao + Billing
**DDD Layer:** Application
**Repositorio:** OS Service (orquestrador) + Execucao + Billing (acoes compensatorias)

## Contexto

Enunciado: "deve haver rollback e compensacao no caso de falha em qualquer
etapa". Aplicamos o criterio da AWS: falha de plataforma -> **retry**
(recuperacao para frente); falha de negocio -> **compensacao** (recuperacao
para tras). Toda compensacao e idempotente e pode ser reexecutada.

## Criterios de Aceite

- [ ] Matriz passo -> falha -> compensacoes documentada e implementada:
  - enfileirar recusado -> OS `CANCELADA`
  - orcamento rejeitado -> `execucao.liberar-reservas` -> OS `CANCELADA`
  - pagamento recusado/timeout -> `billing.cancelar-orcamento` + `execucao.liberar-reservas` -> OS `CANCELADA`
  - falha ao iniciar execucao apos pagamento -> estorno (Billing) + liberar reservas -> OS `CANCELADA`
- [ ] Compensacoes executadas em ordem inversa e registradas em `saga_os`
- [ ] Retry com backoff nos comandos (SQS visibility) e **DLQ** apos 5 tentativas; alarme -> runbook "reprocessar da DLQ" (licao do *mortician* do Nubank: triagem humana, nunca descartar)
- [ ] Endpoint interno `POST /admin/sagas/:os/reprocessar` (ADMIN) para retomar uma saga travada
- [ ] **Injecao de falhas para demo:** header/flag `x-simular-falha=<passo>` em ambiente nao-produtivo e cartoes de teste do Mercado Pago
- [ ] Teste de integracao para cada linha da matriz
## Dependencias

- [US-F4-10](f4-10-saga-orquestrada.md)
