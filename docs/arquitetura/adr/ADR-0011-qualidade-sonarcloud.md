# ADR-0011: Validação de qualidade no CI com SonarCloud

**Status:** Aceita
**Data:** 2026-09-30

## Contexto

O enunciado exige "validação de qualidade do código via SonarQube ou similar no
CI", cobertura mínima de **80 % por serviço** e "evidências de cobertura (prints
ou links no README)". Já existe um SonarQube local em `infra/sonar/` (Fase 2),
mas hospedá-lo na AWS custaria uma instância ligada 24/7.

## Decisão

- **SonarCloud** (SaaS, gratuito para repositórios públicos) em **todos** os
  repositórios de código: `os-service`, `billing-service`, `execucao-service`,
  `kit` e `auth-lambda`.
- Análise em cada PR e em `main` (`sonar-project.properties` + action oficial),
  com o **Quality Gate como check obrigatório** da branch protection.
- Quality gate: cobertura em código novo ≥ 80 %, 0 bugs e 0 vulnerabilidades
  novas, duplicação < 3 %, *security hotspots* revisados.
- Jest mantém `coverageThreshold` de 80 % (linhas, funções, branches) como gate
  local — o Sonar é a evidência pública, o Jest é a barreira rápida.
- Badges do quality gate e da cobertura no topo de cada README = evidência exigida.

## Consequências

- O `infra/sonar/` local fica como opcional para análise offline; o CI não depende dele.
- `SONAR_TOKEN` como secret em cada repo (organização SonarCloud `guilhermeqmaia`).
- Pull requests de forks não recebem o token — irrelevante (time trabalha em branches).
