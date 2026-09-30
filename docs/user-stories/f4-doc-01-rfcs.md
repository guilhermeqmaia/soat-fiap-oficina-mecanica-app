# US-F4-DOC-01: RFCs — Decomposicao, Saga, Mensageria e NoSQL

**User Story:** Como Arquiteto do time, quero registrar as quatro decisoes estruturantes da Fase 4 em RFCs com alternativas avaliadas, para que a divisao dos microsservicos, a estrategia de saga, o broker e o banco NoSQL sejam justificados no README/PDF como o enunciado exige.

**Prioridade:** Alta
**Story Points:** 3
**Status:** Concluída
**DDD Domain:** Todos (decisoes transversais)
**DDD Layer:** Documentacao (`docs/arquitetura/rfcs/`)
**Repositorio:** 4 — hub de documentacao (`soat-fiap-oficina-mecanica-app`)

## Contexto

A Fase 4 exige *documentar e justificar* a divisao dos microsservicos, a escolha
entre saga orquestrada/coreografada e as tecnologias. O [plano da Fase 4](../plano-execucao-fase-4.md) traz a
recomendacao inicial; esta historia formaliza cada decisao com alternativas,
seguindo o formato das RFCs da Fase 3 (Contexto -> Opcoes -> Decisao -> Consequencias).

## Criterios de Aceite

- [x] **RFC-0004 — Decomposicao em microsservicos:** OS Service, Billing Service e Execucao Service; onde ficam Cliente/Veiculo, Catalogo, Estoque e Notificacao; alternativa de 5 servicos (um por bounded context) avaliada e descartada com motivo
- [x] **RFC-0005 — Estrategia de Saga:** orquestrada (orquestrador no OS Service) vs coreografada; passos, compensacoes, timeouts e onde o estado da saga e persistido; referencia ao criterio da AWS (recuperacao para frente vs para tras)
- [x] **RFC-0006 — Mensageria:** SNS+SQS (FIFO + DLQ) vs Amazon MQ (RabbitMQ) vs MSK (Kafka); custo mensal estimado de cada opcao na conta propria; emulacao local
- [x] **RFC-0007 — Banco NoSQL:** DynamoDB (Execucao) vs MongoDB/DocumentDB vs Redis; modelo de acesso (single-table, chaves) e por que o servico de Execucao e o candidato
- [x] Cada RFC referencia as historias que a implementam e o insight de mercado correspondente da secao "O que o mercado brasileiro faz" do plano
- [x] `docs/arquitetura/rfcs/README.md` atualizado
## Dependencias

- Precede toda a implementacao (Onda 0 do [plano da Fase 4](../plano-execucao-fase-4.md))
