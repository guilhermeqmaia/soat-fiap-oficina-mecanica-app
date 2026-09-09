# ADR-0002: Autoescalonamento horizontal com HPA

**Status:** Aceita
**Data:** 2026-08-24

## Contexto

O enunciado exige escalabilidade comprovada do cluster Kubernetes. A Fase 2
já validou HPA em kind com testes de carga k6 (`perf/`); a Fase 3 migra para
EKS mantendo o mecanismo.

## Decisão

Usaremos **HorizontalPodAutoscaler** por **CPU e memória** (target 70%),
`minReplicas: 2` / `maxReplicas: 10`, com **metrics-server** instalado como
add-on do cluster (US-F3-05). Requests/limits dos pods calibrados para o node
group. Escalonamento de nodes fica com o managed node group/cluster
autoscaler — dimensão separada do HPA.

## Consequências

- `minReplicas: 2` garante disponibilidade mínima multi-pod mesmo sem carga.
- O HPA só funciona com requests definidos — manter requests/limits passa a
  ser obrigatório em todo deployment.
- Os testes de carga (`perf/hpa.js`, ~300 rps) validam o comportamento; ao
  rodá-los através do gateway é preciso considerar o throttling de borda
  (limites do stage — ver `gateway/` no repo de infra) ou apontar direto para
  o serviço interno em testes de plataforma.
