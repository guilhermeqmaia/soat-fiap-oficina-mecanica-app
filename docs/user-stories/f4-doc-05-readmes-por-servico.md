# US-F4-DOC-05: READMEs por Servico com Evidencias de Cobertura e Swagger

**User Story:** Como Avaliador, quero que cada repositorio de microsservico tenha um README completo (arquitetura do servico, execucao, deploy, evidencias de cobertura, Swagger), para avaliar cada entregavel de forma independente.

**Prioridade:** Media
**Story Points:** 3
**Status:** To Do
**DDD Domain:** Todos
**DDD Layer:** Documentacao
**Repositorio:** os-service, billing-service, execucao-service (+ kit)

## Contexto

Entregaveis da Fase 4 por repositorio: codigo, Dockerfile e manifestos,
pipelines, **evidencias de cobertura (prints ou links)**, documentacao da
arquitetura do servico e Swagger/Postman atualizado.

## Criterios de Aceite

- [ ] Proposito, bounded context(s) que o servico possui e o que ele **nao** possui
- [ ] Diagrama do servico (Mermaid): API, consumidores/produtores de eventos, banco proprio
- [ ] Eventos que publica e consome (link para o AsyncAPI)
- [ ] Execucao local (compose do servico + emulacao de SQS/Dynamo) e como rodar o fluxo completo (compose do hub)
- [ ] Badges de CI, **SonarCloud (quality gate + cobertura)** no topo
- [ ] Secao "Evidencias de cobertura": link do SonarCloud + print do relatorio no repo (`docs/evidencias/`)
- [ ] Link do Swagger (`/api`) e collection Postman/Bruno em `docs/`
- [ ] Deploy: variaveis, secrets, manifestos, rollback
