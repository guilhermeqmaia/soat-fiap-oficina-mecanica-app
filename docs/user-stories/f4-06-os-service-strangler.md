# US-F4-06: OS Service — Evolucao do Monolito (Strangler) e Publicacao de Eventos

**User Story:** Como Atendente, quero abrir e acompanhar ordens de servico num servico dedicado que publica eventos confiaveis, para que diagnostico, orcamento e execucao aconteçam em outros servicos sem que a OS perca consistencia.

**Prioridade:** Alta
**Story Points:** 8
**Status:** Em andamento — PR 1 (domínio/API/banco, #87) e PR 2 (outbox + consumidores SQS) entregues; PR 3 (NodePort, rename do repo) a seguir. QA: [QA_PLAN_US-F4-06](../qa-plans/QA_PLAN_US-F4-06.md)
**DDD Domain:** Atendimento (OrdemDeServico, Cliente, Veiculo) + Notificacao
**DDD Layer:** Domain + Application + Infrastructure
**Repositorio:** `soat-fiap-oficina-mecanica-app` -> OS Service

## Contexto

Estrategia *strangler*: o monolito da Fase 3 ja e, em essencia, o OS Service.
Removem-se Catalogo, Estoque e a execucao (vao para a Execucao); orcamento e
pagamento vao para o Billing. A OS guarda um **snapshot** dos itens (nome,
quantidade, preco) que chega pelos eventos — nunca consulta o catalogo de outro
servico. `@OnEvent` in-process vira publicacao via outbox (ADR-0001 previu isso).

## Criterios de Aceite

- [x] Modulos `produto`, `servico` e casos de uso de execucao/orcamento removidos; `architecture.spec.ts` atualizado
- [x] OS mantem Cliente, Veiculo, historico/auditoria de status, consulta por CPF (posse via claim) e tempo medio por status (metrica Prometheus `oficina_os_tempo_no_status_seconds`; o tempo medio de *execucao* por servico vai com a Execucao)
- [x] Novo status **`AGUARDANDO_PAGAMENTO`** entre `AGUARDANDO_APROVACAO` e `EM_EXECUCAO`; maquina de estados atualizada e testada (+ `motivoCancelamento` para as compensacoes)
- [x] Publica via **outbox**: `os.aberta` (com veiculo/cliente resumidos), `os.cancelada`, `os.finalizada`, `os.entregue` (gravados na transacao da OS; `OutboxPoller` -> `oficina-os.fifo`)
- [x] Consome: `execucao.diagnostico-concluido` (grava snapshot dos itens), `billing.orcamento-gerado`, `billing.pagamento-aprovado`, `execucao.finalizada` — consumidores idempotentes (fila `os-eventos.fifo`, 12 handlers em `infrastructure/messaging/`, dedup em `processed_messages`; `pagamento-aprovado`/`orcamento-cancelado`/`reservas-liberadas` so logam ate o orquestrador da US-F4-10)
- [x] Endpoints de mutacao removidos: adicionar servico/produto, aprovar/rejeitar, iniciar/concluir servico (agora nos outros servicos) — Swagger atualizado; novo `POST /ordens-servico/:id/cancelar`
- [ ] UIs `admin`/`cliente` apontam para os novos servicos *(depende dos endpoints da Execucao/Billing — US-F4-07/08)*
- [ ] Notificacao ao cliente continua aqui, alimentada pelos eventos ([US-F4-12](f4-12-notificacoes-por-eventos.md))
- [ ] Usa o kit ([US-F4-01](f4-01-kit-compartilhado.md)); cobertura >= 80%; repositorio renomeado para `soat-fiap-oficina-os-service` (GitHub redireciona; decisao registrada)
## Dependencias

- [US-F4-01](f4-01-kit-compartilhado.md), [US-F4-02](f4-02-mensageria.md), [US-F4-03](f4-03-bancos-por-servico.md)
