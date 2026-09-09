# ADRs — Architecture Decision Records

ADRs registram as **decisões arquiteturais permanentes** (formato Nygard:
Contexto → Decisão → Consequências). O processo de decisão com alternativas,
quando existiu, está na [RFC](../rfcs/README.md) correspondente — os
documentos se linkam, não se duplicam.

Template: [TEMPLATE.md](TEMPLATE.md)

| ADR | Título | Status | Data |
|---|---|---|---|
| [ADR-0001](ADR-0001-padrao-de-comunicacao.md) | Padrão de comunicação entre componentes | Aceita | 2026-08-24 |
| [ADR-0002](ADR-0002-hpa-autoescalonamento.md) | Autoescalonamento horizontal com HPA | Aceita | 2026-08-24 |
| [ADR-0003](ADR-0003-app-resource-server.md) | Aplicação como Resource Server (valida-apenas) | Aceita | 2026-08-24 |
| [ADR-0004](ADR-0004-plataforma-de-observabilidade.md) | Plataforma de observabilidade (Datadog) | Aceita | 2026-08-24 |
| [ADR-0005](ADR-0005-api-gateway.md) | API Gateway (AWS API Gateway HTTP API) | Aceita | 2026-08-24 |
| [ADR-0006](ADR-0006-segregacao-4-repositorios.md) | Segregação em 4 repositórios e branches/deploy | Aceita | 2026-08-24 |

## Ciclo de vida

Uma ADR aceita não é editada em substância: mudanças de decisão geram uma
nova ADR com status `Substituída por ADR-XXXX` na antiga. Numeração
sequencial `ADR-0001, 0002, ...`.
