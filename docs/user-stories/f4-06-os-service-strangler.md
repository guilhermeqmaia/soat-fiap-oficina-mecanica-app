# US-F4-06: OS Service — Evolucao do Monolito (Strangler) e Publicacao de Eventos

**User Story:** Como Atendente, quero abrir e acompanhar ordens de servico num servico dedicado que publica eventos confiaveis, para que diagnostico, orcamento e execucao aconteçam em outros servicos sem que a OS perca consistencia.

**Prioridade:** Alta
**Story Points:** 8
**Status:** To Do
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

- [ ] Modulos `produto`, `servico` e casos de uso de execucao/orcamento removidos; `architecture.spec.ts` atualizado
- [ ] OS mantem Cliente, Veiculo, historico/auditoria de status, consulta por CPF (posse via claim) e tempo medio por status
- [ ] Novo status **`AGUARDANDO_PAGAMENTO`** entre `AGUARDANDO_APROVACAO` e `EM_EXECUCAO`; maquina de estados atualizada e testada
- [ ] Publica via **outbox**: `os.aberta` (com veiculo/cliente resumidos), `os.cancelada`, `os.finalizada`, `os.entregue`
- [ ] Consome: `execucao.diagnostico-concluido` (grava snapshot dos itens), `billing.orcamento-gerado`, `billing.pagamento-aprovado`, `execucao.finalizada` — consumidores idempotentes
- [ ] Endpoints de mutacao removidos: adicionar servico/produto, aprovar/rejeitar, iniciar/concluir servico (agora nos outros servicos) — Swagger atualizado; UIs `admin`/`cliente` apontam para os novos servicos
- [ ] Notificacao ao cliente continua aqui, alimentada pelos eventos ([US-F4-12](f4-12-notificacoes-por-eventos.md))
- [ ] Usa o kit ([US-F4-01](f4-01-kit-compartilhado.md)); cobertura >= 80%; repositorio renomeado para `soat-fiap-oficina-os-service` (GitHub redireciona; decisao registrada)
## Dependencias

- [US-F4-01](f4-01-kit-compartilhado.md), [US-F4-02](f4-02-mensageria.md), [US-F4-03](f4-03-bancos-por-servico.md)
