# RFC-0001: Escolha da nuvem

**Status:** Aceita
**Data:** 2026-08-24
**Autores:** Time SOAT
**Stories relacionadas:** [US-F3-04](../../user-stories/f3-04-terraform-banco-gerenciado.md), [US-F3-05](../../user-stories/f3-05-terraform-cluster-kubernetes.md), [plano da Fase 3](../../plano-execucao-fase-3.md)

## Contexto

A Fase 3 exige infraestrutura em nuvem provisionada por Terraform: API
Gateway, function serverless, banco gerenciado e cluster Kubernetes com
escalabilidade. O time tem acesso de estudante via **AWS Academy Learner Lab**
(créditos limitados, credenciais de sessão temporárias, IAM restrito). Na Fase
2 já existe um esboço de modo "cloud" (EKS+RDS) no Terraform.

## Opções consideradas

### Opção A — AWS

- ✅ Acesso já disponível via AWS Academy (custo zero para o time)
- ✅ Exemplos do enunciado são AWS-first (API Gateway, Lambda)
- ✅ Serviços gerenciados maduros para todos os requisitos: EKS, RDS, Lambda,
  API Gateway, Secrets Manager, ECR, CloudWatch
- ✅ Modo EKS já esboçado no Terraform da Fase 2
- ❌ Restrições do Academy: sem criação de IAM roles (apenas `LabRole`),
  região `us-east-1`, sessões que expiram (~4h)

### Opção B — GCP

- ✅ GKE é maduro; Cloud Functions/Cloud SQL equivalentes
- ❌ Sem acesso de estudante equivalente; free tier insuficiente para
  EKS-class + RDS-class contínuos
- ❌ Curva de aprendizado adicional sem ganho para o enunciado

### Opção C — Azure

- ✅ AKS gerenciado; Azure Functions
- ❌ Mesmo problema de acesso/custo; menor aderência aos exemplos do enunciado

### Opção D — Local/on-prem (kind, como na Fase 2)

- ✅ Custo zero, já dominado pelo time
- ❌ **Não atende o enunciado**: exige nuvem, banco gerenciado e serverless

## Decisão

**AWS**, na conta do **AWS Academy Learner Lab**, região **us-east-1**.
Critérios decisivos: acesso já existente sem custo, aderência ao enunciado e
reaproveitamento do Terraform da Fase 2.

## Consequências

- Todas as escolhas de serviço passam a ser AWS: EKS, RDS, Lambda, AWS API
  Gateway, Secrets Manager, ECR ([ADR-0005](../adr/ADR-0005-api-gateway.md)).
- Restrições do Academy viram regra de projeto: **nenhum Terraform pode criar
  IAM roles** (usar `LabRole`/`LabInstanceProfile`); credenciais de CI/CD só
  via GitHub Actions Secrets, com `AWS_SESSION_TOKEN` renovado por sessão.
- Preferir designs que dispensem roles de conta (ex.: HTTP API em vez de REST
  API para access logs — ver ADR-0005).
- Topologia: **tudo dentro da VPC; somente o API Gateway é público** —
  preparação para os 4 serviços da Fase 4.
