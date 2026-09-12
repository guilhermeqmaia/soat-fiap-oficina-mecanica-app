# ADR-0008: Ambiente efêmero — subir, pausar e derrubar por script

**Status:** Aceita
**Data:** 2026-09-12
**RFC de origem:** —

## Contexto

Com tudo ligado, a Fase 3 custa ~US$ 0,30/h (EKS + 2 nodes + NAT + RDS
Multi-AZ + NLB). A infra vive em 4 repositórios com contratos entre eles
(subnets/SGs → RDS e Lambda; secrets → app; listener do NLB → gateway; URL do
gateway → app), e subir na mão exige preencher ~15 GitHub Variables na ordem
certa. A primeira subida manual levou 46 min e vários ciclos de correção.

## Decisão

O ambiente é **efêmero e reproduzível por script** (repo infra-k8s,
`scripts/`), sempre através dos workflows de CD dos repositórios — o script
não roda Terraform localmente, só orquestra:

- `aws-deploy-all.sh` sobe tudo do zero em ~30 min: cluster ∥ (RDS → Lambda)
  → app → gateway → app com URL pública → seeds → smoke. Lê IDs da rede por
  tag na AWS e outputs do state em S3 e grava as GitHub Variables sozinho;
  `--from <etapa>` retoma.
- `aws-pause.sh` / `aws-resume.sh` entre sessões de gravação: app → 0, node
  group → 0 e RDS parado (~US$ 3,5/dia); retomar leva ~7 min e mantém a URL.
- `aws-destroy-all.sh` derruba na ordem inversa (~25 min) e confere que
  nenhum recurso cobrável sobrou.

## Consequências

- Nenhuma URL pública é fixa: o gateway nasce a cada ciclo — por isso o app
  recebe `GATEWAY_URL` e faz um segundo deploy (com `rollout restart`, já
  que ConfigMap via `envFrom` só entra em pods novos).
- Recursos que atrapalham o ciclo curto são configurados para ele: secrets
  sem janela de recuperação, `deletion_protection` do RDS desligado antes
  do destroy, ENIs da Lambda apagadas assim que desanexam.
- O pause zera a aplicação **antes** dos nós: com o banco parado os pods
  ficam `0/1`, o PDB (`minAvailable: 1`) passa a permitir zero disrupções e
  o drain travaria.
- Merges em `cluster/`/`gateway/` com o ambiente derrubado usam `[skip ci]`
  para o CD não recriar o cluster sozinho.
