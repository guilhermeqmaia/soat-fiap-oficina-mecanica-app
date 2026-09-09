# ADR-0001: Padrão de comunicação entre componentes

**Status:** Aceita
**Data:** 2026-08-24

## Contexto

A solução tem quatro componentes (gateway, Lambda de auth, monólito no EKS,
banco) e integrações de saída (notificação ao cliente). É preciso fixar como
eles conversam para que os repositórios evoluam sem renegociar contratos.

## Decisão

- **Borda → aplicação: REST síncrono via API Gateway.** Toda chamada externa
  entra pelo gateway (HTTP API) e chega ao monólito por VPC Link; contratos
  documentados por Swagger no monólito.
- **Dentro do monólito: eventos in-process (`@OnEvent`).** Os bounded contexts
  (Atendimento, Estoque, Notificação) comunicam-se por eventos de domínio do
  NestJS — sem chamadas diretas entre módulos de contextos diferentes.
- **Saída para o cliente: webhook outbound com HMAC** (Notificação), com os
  links de aprovação por e-mail apontando para as rotas públicas do gateway.
- **Sem broker externo nesta fase.** Fila/mensageria só entra se a Fase 4
  (microsserviços) exigir — será nova ADR.

## Consequências

- Contratos síncronos simples e testáveis; o Swagger do monólito é a fonte
  de verdade da API (estratégia proxy no gateway — ver ADR-0005).
- Os eventos `@OnEvent` preservam o desacoplamento entre contextos e são o
  ponto natural de corte para extrair microsserviços na Fase 4 (cada evento
  in-process vira candidato a evento de broker).
- `PUBLIC_BASE_URL` da aplicação deve apontar para a URL pública do gateway
  para os links de webhook funcionarem.
