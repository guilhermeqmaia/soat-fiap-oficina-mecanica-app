# US-F4-02: Mensageria — SNS + SQS FIFO com DLQ (Terraform)

**User Story:** Como Plataforma, quero topicos e filas provisionados por Terraform com DLQ e ordenacao por OS, para que os servicos se integrem de forma assincrona e desacoplada sem perder mensagens.

**Prioridade:** Alta
**Story Points:** 5
**Status:** To Do
**DDD Domain:** Transversal
**DDD Layer:** Infrastructure (Terraform)
**Repositorio:** 2 — `soat-fiap-oficina-infra-k8s` (stage `messaging/`)

## Contexto

Enunciado: "Mensageria assincrona (RabbitMQ, Kafka, SQS, etc.) para eventos e
integracao desacoplada". Decisao (RFC-0006): **SNS + SQS**, AWS-nativo,
serverless e barato; FIFO com `MessageGroupId` = numero da OS garante ordem por
saga; DLQ nativa por fila.

## Criterios de Aceite

- [ ] Stage `messaging/` no infra-k8s: topicos SNS FIFO por dominio (`oficina-os`, `oficina-execucao`, `oficina-billing`) e filas SQS FIFO por consumidor (ex.: `execucao-de-os`, `billing-de-execucao`, `os-de-billing`, `os-de-execucao`, `notificacao`)
- [ ] Assinaturas SNS -> SQS com **filtro por `type`** (message attributes) — um consumidor so recebe o que assina
- [ ] **DLQ por fila** (`maxReceiveCount` 5) + alarme CloudWatch/Datadog quando DLQ > 0
- [ ] Politica de acesso: cada servico so publica no proprio topico e so consome as proprias filas (IAM policy por service account ou por credencial no Secrets Manager — respeitando o modo da conta)
- [ ] Outputs (ARNs/URLs) publicados no Secrets Manager/SSM para os deploys lerem
- [ ] Compose de referencia com LocalStack reproduzindo a mesma topologia (script `scripts/messaging-local.sh`)
- [ ] Custo mensal estimado documentado (free tier: 1M req SQS/mes)
## Dependencias

- [US-F4-DOC-01](f4-doc-01-rfcs.md) (RFC-0006)
