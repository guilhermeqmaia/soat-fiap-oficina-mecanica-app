# US-F4-13: Testes Unitarios >= 80% por Servico e Quality Gate no CI

**User Story:** Como Time, quero cobertura minima de 80% em cada microsservico e validacao de qualidade bloqueante no CI, para que a decomposicao nao reduza a qualidade conquistada nas fases anteriores.

**Prioridade:** Alta
**Story Points:** 5
**Status:** To Do
**DDD Domain:** Todos
**DDD Layer:** Testes + CI
**Repositorio:** os-service, billing-service, execucao-service, kit

## Contexto

Enunciado: testes unitarios em todos os servicos, cobertura >= 80% por
servico, SonarQube ou similar no CI. Decisao (ADR-0011): **SonarCloud** (gratis
para repos publicos) com quality gate como check obrigatorio de branch protection.

## Criterios de Aceite

- [ ] `sonar-project.properties` em cada repo; analise em PR e em `main`
- [ ] Quality gate: cobertura nova >= 80%, 0 bugs/vulnerabilidades novas, duplicacao < 3%
- [ ] Jest com `coverageThreshold` 80% (linhas, funcoes, branches) em cada servico — gate local + Sonar
- [ ] Testes de dominio puros (entidades, maquina de estados, orquestrador) sem infraestrutura
- [ ] Testes de integracao com Testcontainers (Postgres) e DynamoDB Local
- [ ] Badge do quality gate e cobertura no README (evidencia exigida)
## Dependencias

- [US-F4-04](f4-04-repos-e-cicd-por-servico.md)
