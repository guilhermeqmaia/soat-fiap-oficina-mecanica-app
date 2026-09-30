# US-F4-15: Testes de Contrato dos Eventos

**User Story:** Como Desenvolvedor, quero que produtores e consumidores sejam validados contra o schema dos eventos no CI, para que uma mudanca incompativel num servico quebre o build e nao a producao.

**Prioridade:** Media
**Story Points:** 3
**Status:** To Do
**DDD Domain:** Todos (integracao)
**DDD Layer:** Testes
**Repositorio:** kit + os-service, billing-service, execucao-service

## Contexto

Sem contrato testado, mensageria vira acoplamento invisivel. Os schemas do
AsyncAPI ([US-F4-DOC-03](f4-doc-03-contratos-eventos.md)) sao a fonte.

## Criterios de Aceite

- [ ] Schemas JSON publicados no kit (`@soat-fiap/oficina-kit/contracts`) a partir do AsyncAPI
- [ ] Produtores validam a mensagem contra o schema antes de gravar no outbox (falha = erro de programacao, nunca chega ao broker)
- [ ] Consumidores validam na entrada; mensagem invalida -> DLQ com motivo
- [ ] Teste no CI de cada servico: fixtures de todos os eventos que o servico produz/consome passam no schema da versao publicada
- [ ] Regra de compatibilidade: campos novos opcionais = minor; remocao/renomeacao = major + novo canal versionado
## Dependencias

- [US-F4-DOC-03](f4-doc-03-contratos-eventos.md), [US-F4-01](f4-01-kit-compartilhado.md)
