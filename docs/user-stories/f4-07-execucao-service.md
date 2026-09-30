# US-F4-07: Execucao Service — Fila de Execucao, Diagnostico, Catalogo e Estoque em DynamoDB

**User Story:** Como Mecanico, quero uma fila de execucao com diagnostico, itens do catalogo e reserva de pecas num servico proprio, para trabalhar a OS do chao de oficina e comunicar a finalizacao sem depender do atendimento.

**Prioridade:** Alta
**Story Points:** 13
**Status:** To Do
**DDD Domain:** Execucao (novo) + Catalogo + Estoque
**DDD Layer:** Domain + Application + Infrastructure
**Repositorio:** novo — `soat-fiap-oficina-execucao-service`

## Contexto

Enunciado: "gerenciar a fila de execucao da OS; atualizar status durante
diagnostico e reparos; comunicar finalizacao ao OS Service". Catalogo e
Estoque vem junto porque e o mecanico quem adiciona servicos/pecas e reserva
estoque durante o diagnostico. Banco **NoSQL (DynamoDB)**: a "execucao de uma
OS" e um documento com timeline; o estoque usa *conditional writes*.

## Criterios de Aceite

- [ ] Modelo single-table: `EXECUCAO#<os>` (status da fila, mecanico, itens, timeline), `SERVICO#`/`PRODUTO#` (catalogo com preco), `ESTOQUE#<produto>` (saldo, reservas)
- [ ] Consome `execucao.enfileirar` (comando) -> cria item na fila -> publica `execucao.enfileirada`; recusa (veiculo ja em execucao) -> publica falha para compensacao
- [ ] `POST /execucao/:os/atribuir` (mecanico), `POST /execucao/:os/itens` (servicos/produtos do catalogo, com **reserva de estoque** condicional `saldo - reservado >= qtd`), `POST /execucao/:os/diagnostico/concluir` -> publica `execucao.diagnostico-concluido` com itens e **precos congelados**
- [ ] Consome `execucao.iniciar` -> baixa efetiva do estoque -> `execucao.iniciada`; `execucao.liberar-reservas` -> devolve reservas -> `execucao.reservas-liberadas` (compensacao, idempotente)
- [ ] `POST /execucao/:os/servicos/:id/concluir`; ultimo servico concluido -> `execucao.finalizada` (policy da Fase 1 mantida)
- [ ] CRUD de catalogo (`/catalogo/servicos`, `/catalogo/produtos`) e estoque (`/estoque/movimentacoes`, alerta de estoque baixo) com roles GESTOR/ESTOQUISTA
- [ ] Outbox via DynamoDB Streams -> publicacao SNS (ou poller) — documentado no kit
- [ ] Testes unitarios >= 80% (dominio puro) + integracao com DynamoDB Local; Swagger
## Dependencias

- [US-F4-01](f4-01-kit-compartilhado.md), [US-F4-02](f4-02-mensageria.md), [US-F4-03](f4-03-bancos-por-servico.md), [US-F4-DOC-03](f4-doc-03-contratos-eventos.md)
