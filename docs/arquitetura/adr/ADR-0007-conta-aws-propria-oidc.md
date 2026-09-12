# ADR-0007: Conta AWS própria com OIDC (AWS Academy como fallback)

**Status:** Aceita
**Data:** 2026-09-12
**RFC de origem:** [RFC-0001](../rfcs/RFC-0001-escolha-da-nuvem.md) (adendo)

## Contexto

A RFC-0001 escolheu a AWS na conta do **AWS Academy Learner Lab**. Na prática o
lab trouxe dois custos operacionais altos para um time pequeno: credenciais
temporárias que expiram a cada sessão (~4h) e precisam ser rotacionadas nos
4 repositórios, e a proibição de criar IAM roles (tudo via `LabRole`, sem
OIDC para o GitHub Actions). Uma conta AWS nova no plano **Free** oferece
US$ 100+ de créditos, EKS/RDS/NAT/NLB liberados e nunca gera cobrança sem
upgrade explícito — o custo de subir/derrubar o ambiente para a demo é de
centavos.

## Decisão

Usaremos uma **conta AWS própria** (plano Free) como ambiente principal da
Fase 3, autenticando o CI/CD por **OIDC**: um provider do GitHub e uma única
role (`github-actions-oficina`) confiada aos 4 repositórios `soat-fiap-oficina-*`
(inclusive na forma de `sub` com IDs imutáveis do GitHub), gravada no secret
`AWS_ROLE_ARN`. O Terraform passa a criar as próprias roles (cluster, nodes,
Lambda) quando `lab_role_arn` está vazio. O **Academy continua suportado**
como fallback: mesmos workflows com `AWS_ACCESS_KEY_ID/SECRET/SESSION_TOKEN`
e `LAB_ROLE_ARN`, com scripts de bootstrap e rotação por sessão.

## Consequências

- Fim da rotação de credenciais: nada no CI/CD expira.
- Menor privilégio nas roles do EKS/Lambda em vez da `LabRole` genérica;
  os stages ficam **dual-mode** (`lab_role_arn` preenchido ⇒ Academy).
- Limites do plano Free viram configuração, não regra de arquitetura: tipos de
  instância *free-tier-eligible* (`NODE_INSTANCE_TYPES=["m7i-flex.large"]`) e
  retenção de backup do RDS de 1 dia (`DB_BACKUP_RETENTION_DAYS`); em conta
  paga voltam aos defaults do Terraform (t3.medium, 7 dias).
- O RDS exige TLS (`rds.force_ssl`): a aplicação liga `DB_SSL=true` no overlay
  de AWS, mesma convenção da Lambda de auth.
- Guarda-corpos da conta: AWS Budget com alerta por e-mail e o próprio plano
  Free, que bloqueia cobranças além dos créditos.
