# US-F4-16: Observabilidade Distribuida — Traces atraves das Mensagens, Dashboards por Servico e Alertas de Fila

**User Story:** Como Operacao, quero seguir uma OS atraves dos tres servicos e das filas num unico trace e ver a saude de cada servico e de cada fila, para diagnosticar falhas do fluxo distribuido em minutos.

**Prioridade:** Alta
**Story Points:** 5
**Status:** To Do
**DDD Domain:** Transversal
**DDD Layer:** Infrastructure (observabilidade)
**Repositorio:** kit + os/billing/execucao + infra-k8s `observability/`

## Contexto

Enunciado: usar a observabilidade da Fase 3 e demonstrar "monitoramento e
rastreamento dos fluxos distribuidos". O que muda: o contexto de trace precisa
atravessar o broker, e as filas viram sinal de saude.

## Criterios de Aceite

- [ ] `traceparent` e `correlationId` (numero da OS) propagados em message attributes pelo kit; consumidores continuam o trace (span `sqs.process` filho do produtor)
- [ ] Logs JSON de todos os servicos com `trace_id`, `correlation_id`, `servico` — filtro por OS mostra a saga inteira
- [ ] Dashboards: "Oficina — Fluxo distribuido" (sagas por passo, tempo por passo, compensacoes, DLQ por fila, lag/idade da mensagem mais antiga) + um painel tecnico por servico
- [ ] Alertas: DLQ > 0, idade da mensagem mais antiga > 5 min, taxa de compensacao > X%, 5xx por servico, webhook do Mercado Pago com falha de assinatura
- [ ] Runbooks por alerta (padrao da Fase 3)
- [ ] Evidencia no QA Plan: screenshot de um trace atravessando os tres servicos
## Dependencias

- [US-F4-01](f4-01-kit-compartilhado.md), [US-F4-02](f4-02-mensageria.md)
