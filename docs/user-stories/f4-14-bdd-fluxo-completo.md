# US-F4-14: BDD do Fluxo Completo da OS (Cucumber)

**User Story:** Como Product Owner, quero o fluxo completo da OS descrito em Gherkin e executado automaticamente contra os tres servicos, para validar o comportamento de negocio ponta a ponta na linguagem do dominio.

**Prioridade:** Alta
**Story Points:** 8
**Status:** To Do
**DDD Domain:** Todos (fluxo distribuido)
**DDD Layer:** Testes (BDD)
**Repositorio:** 4 — hub (`e2e/` com compose de todos os servicos)

## Contexto

Enunciado: "pelo menos um fluxo completo testado com BDD". Usaremos
`@cucumber/cucumber` com Gherkin em portugues (`# language: pt`), rodando num
compose com os tres servicos, LocalStack (SNS/SQS/DynamoDB), Postgres e um
mock do Mercado Pago.

## Criterios de Aceite

- [ ] `docker-compose.fase4.yml` no hub sobe os tres servicos (imagens publicadas ou build local), LocalStack, Postgres x2, DynamoDB Local, mock do Mercado Pago (WireMock) e a Lambda de auth local
- [ ] `features/ordem-de-servico.feature`: **Cenario feliz** (abrir OS -> diagnostico -> orcamento -> aprovar -> pagar -> executar -> finalizar -> entregar) verificando o status em cada servico
- [ ] **Cenario de compensacao**: pagamento recusado -> reservas liberadas -> orcamento cancelado -> OS `CANCELADA`
- [ ] **Cenario de idempotencia**: evento reentregue nao duplica efeito
- [ ] Steps em TypeScript reutilizando o token da `mintToken`; espera por eventos com polling e timeout
- [ ] Executado no CI do hub (`bdd.yml`) a cada PR dos servicos via `repository_dispatch` e nightly
- [ ] Relatorio HTML do Cucumber publicado como artifact e linkado no README
## Dependencias

- [US-F4-10](f4-10-saga-orquestrada.md), [US-F4-11](f4-11-compensacoes-rollback.md)
