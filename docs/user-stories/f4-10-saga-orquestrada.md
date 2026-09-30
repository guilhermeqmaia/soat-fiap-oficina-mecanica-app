# US-F4-10: Saga Orquestrada da Ordem de Servico

**User Story:** Como Sistema, quero coordenar abrir OS -> diagnostico -> orcamento -> aprovacao/pagamento -> execucao -> finalizacao como uma saga com estado explicito, para que a OS avance entre tres servicos e tres bancos de forma consistente e rastreavel.

**Prioridade:** Alta
**Story Points:** 13
**Status:** To Do
**DDD Domain:** Atendimento (orquestracao do ciclo de vida da OS)
**DDD Layer:** Application (orquestrador) + Infrastructure (mensageria)
**Repositorio:** OS Service

## Contexto

Decisao (RFC-0005): **saga orquestrada**, com o orquestrador dentro do OS
Service — dono do ciclo de vida da OS, como o Gateway Core do iFood e uma
maquina de estados dos pedidos. O orquestrador envia **comandos** e reage a
**eventos**; o estado de cada saga e persistido e consultavel (isso e o que o
video precisa mostrar em "rastreamento dos fluxos distribuidos").

## Criterios de Aceite

- [ ] Tabela `saga_os` (numero da OS, passo atual, status, historico de passos com timestamps, compensacoes executadas, `correlationId`)
- [ ] Passos: `ENFILEIRAR_EXECUCAO` -> `AGUARDAR_DIAGNOSTICO` -> `GERAR_ORCAMENTO` -> `AGUARDAR_APROVACAO` -> `AGUARDAR_PAGAMENTO` -> `INICIAR_EXECUCAO` -> `AGUARDAR_FINALIZACAO` -> `CONCLUIDA`
- [ ] Cada passo: comando enviado via outbox; transicao so ao receber o evento esperado; eventos fora de ordem/duplicados ignorados com log (idempotencia)
- [ ] Transicoes da OS ligadas aos passos (`EM_DIAGNOSTICO`, `AGUARDANDO_APROVACAO`, `AGUARDANDO_PAGAMENTO`, `EM_EXECUCAO`, `FINALIZADA`)
- [ ] **Timeouts** (scheduler): orcamento sem resposta em N dias e pagamento pendente em M horas -> compensacao ([US-F4-11](f4-11-compensacoes-rollback.md))
- [ ] `GET /ordens-servico/:numero/saga` devolve a linha do tempo (passos, eventos, compensacoes) — usado no video e no dashboard
- [ ] Metricas: `oficina_os_saga_passos_total{passo,resultado}`, duracao por passo, sagas em compensacao
- [ ] Testes unitarios do orquestrador como maquina de estados pura (>= 90% do modulo)
## Dependencias

- [US-F4-06](f4-06-os-service-strangler.md), [US-F4-07](f4-07-execucao-service.md), [US-F4-08](f4-08-billing-orcamento.md), [US-F4-DOC-03](f4-doc-03-contratos-eventos.md)
