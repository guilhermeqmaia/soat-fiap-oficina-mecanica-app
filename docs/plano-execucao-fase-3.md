# Plano de Execução — Fase 3 Tech Challenge

Organizado em ondas com dependências claras. Estimativas em dias-ideais de uma pessoa.

Referência do enunciado: [tech-challenges/fase-3-tech-challenge.pdf](tech-challenges/fase-3-tech-challenge.pdf)

> **Tema da Fase 3:** elevar a aplicação a um nível de operação corporativa —
> **segurança** (autenticação via CPF + API Gateway), **escalabilidade e alta
> disponibilidade** (Kubernetes gerenciado em nuvem), **observabilidade total**
> (APM, métricas, logs estruturados, dashboards e alertas), **segregação em 4
> repositórios com CI/CD completo** e **documentação arquitetural formal** (RFCs,
> ADRs, diagramas de componentes e de sequência, justificativa do banco).

---

## O que a Fase 3 exige (resumo do enunciado)

| Bloco | Requisito |
|---|---|
| **Autenticação + API Gateway** | API Gateway (AWS API Gateway/Kong/Traefik). Proteger rotas sensíveis com autenticação via **CPF**. **Function Serverless** que valida o CPF, consulta existência/status do cliente na base e devolve um **JWT**. |
| **4 Repositórios + CI/CD** | Segregar em **4 repositórios** (Lambda, Infra K8s/Terraform, Infra Banco/Terraform, Aplicação em K8s). Cada um com CI/CD e **deploy automático** para a nuvem. `main` protegida (sem commit direto), PR obrigatório, deploy automático de homologação e produção. |
| **Infraestrutura (nuvem)** | API Gateway, Function Serverless, **Banco Gerenciado**, **Cluster Kubernetes com escalabilidade**, **Terraform** para provisionamento. |
| **Monitoramento e Observabilidade** | Integrar Datadog/New Relic (ou equivalente). Monitorar **latência**, **CPU/memória do K8s**, **healthchecks/uptime**, **alertas para falhas no processamento de OS**. **Logs estruturados (JSON) com correlação**. Dashboards de **volume diário de OS**, **tempo médio por status** e **erros de integração**. |
| **Documentação da Arquitetura** | Diagrama de **Componentes** (nuvem, APIs, banco, monitoramento), Diagrama de **Sequência** (autenticação + abertura de OS), **RFCs** (nuvem, banco, autenticação), **ADRs** (padrão de comunicação, HPA, ...), **justificativa formal do banco** + ajustes no modelo relacional + **ER**. |
| **Entregáveis** | 4 repos com README completo (propósito, tecnologias, execução/deploy, diagrama, link Swagger/Postman). **Vídeo ≤15 min** (CPF, CI/CD, deploy, APIs protegidas, dashboard ao vivo, logs/traces). **PDF único** com links dos repos, vídeo e docs + confirmação do usuário `soat-architecture` em todos os repos. |

---

## Decisões prévias (tomadas)

| # | Decisão | Escolha | Por quê |
|---|---|---|---|
| 1 | **Nuvem** | **AWS** (acesso via conta de estudante) | Já existe modo "cloud" (EKS+RDS) no Terraform da Fase 2; exemplos do enunciado são AWS-first. Formalizada em RFC. |
| 2 | **Cluster Kubernetes** | **Amazon EKS** com managed node group + `metrics-server` (para HPA) | Cluster gerenciado, escalável, HA multi-AZ. |
| 3 | **Banco Gerenciado** | **Amazon RDS for PostgreSQL** (Multi-AZ) | Mantém Postgres (mesmo dialeto/migrations da Fase 1/2); ACID, backups gerenciados. Formalizada em RFC + justificativa. |
| 4 | **Function Serverless** | **AWS Lambda** (Node.js/TypeScript) atrás do **AWS API Gateway** | Autenticação via CPF; único emissor de JWT. |
| 5 | **Estratégia de autenticação** | **Substituir toda a autenticação pela função serverless de CPF.** A aplicação vira **resource server** (apenas valida o JWT). O `POST /auth/login` (e-mail/senha) sai do monólito. | Escolha do time. Enunciado exige auth via CPF em rota sensível. **Staff resolvido** ([RFC-0003](arquitetura/rfcs/RFC-0003-estrategia-de-autenticacao.md)): o professor sancionou no fórum credenciais com senha *desde que o CPF seja validado e associado ao usuário* — staff autentica com **CPF + senha na mesma Lambda**; cliente segue só com CPF. |
| 6 | **Observabilidade** | **Primária: Datadog** (nomeada no enunciado; APM + infra + logs + dashboards + alertas num único painel, trial cobre a demo). **Alternativa OSS: Prometheus + Grafana + OpenTelemetry** (métricas/dashboards in-cluster). | As aulas cobrem Prometheus, Grafana, Datadog e New Relic. Escolha final registrada em **ADR**. As histórias de observabilidade descrevem os **sinais** exigidos (independem do fornecedor). |
| 7 | **Container Registry** | **Amazon ECR** (um repositório por imagem) | Integra com IAM/EKS sem credenciais extras. Alternativa: GHCR. |
| 8 | **Granularidade das histórias de doc** | **Conjunto granular** (uma história por artefato) | Rastreabilidade no board. |

---

## Mapeamento dos 4 repositórios

O enunciado exige **quatro repositórios separados**, cada um com CI/CD e deploy
automático. Este repositório atual vira o **Repo 4 (Aplicação)**.

| # | Repositório | Conteúdo | Deploy alvo | Terraform? |
|---|---|---|---|---|
| 1 | `soat-fiap-oficina-auth-lambda` | Function Serverless de autenticação por CPF (código + testes) | AWS Lambda (via API Gateway) | não (a infra da Lambda pode ficar aqui ou no repo 2) |
| 2 | `soat-fiap-oficina-infra-k8s` | Terraform do **cluster EKS** (VPC, node groups, IAM, add-ons, HPA/metrics-server) | AWS EKS | sim |
| 3 | `soat-fiap-oficina-infra-db` | Terraform do **banco gerenciado** (RDS PostgreSQL, subnet group, security groups, secret) | AWS RDS | sim |
| 4 | `soat-fiap-oficina-mecanica-app` (este repo) | Aplicação NestJS + manifestos K8s + CI/CD de deploy no EKS | AWS EKS | não (consome outputs dos repos 2 e 3) |

**Regras de proteção (todos os repos):** `main` protegida (sem push direto),
**PR obrigatório** para merge, **deploy automático** das branches de homologação
(`homolog`) e produção (`main`). Adicionar o usuário **`soat-architecture`** a
todos os repos.

> **Nota de migração:** hoje o Terraform está unificado em `infra/terraform/`
> (`01-cluster` + `02-app`) neste repo. A Fase 3 **separa** esse conteúdo nos
> repos 2 (cluster) e 3 (banco) e migra de kind/Postgres-in-cluster para
> **EKS + RDS**. Ver [f3-07](user-stories/f3-07-segregacao-repositorios.md).

---

## Ondas de execução

### Onda 0 — RFCs e decisões (precede tudo) — 1,5 dia

Formaliza as escolhas de nuvem, banco e autenticação antes de escrever código de
infra. Sem essas RFCs/ADRs, as ondas seguintes ficam sem fundamento documentado
(e o enunciado cobra os artefatos).

- [f3-doc-01 — RFCs](user-stories/f3-doc-01-rfcs.md) (nuvem, banco, autenticação)
- [f3-doc-02 — ADRs](user-stories/f3-doc-02-adrs.md) (padrão de comunicação, HPA, observabilidade, resource server)

### Onda 1 — Autenticação serverless + API Gateway — 4 dias

Dependência: Onda 0 (RFC de auth). É o coração da Fase 3.

- [f3-01 — Function Serverless de autenticação por CPF](user-stories/f3-01-serverless-cpf-auth.md)
- [f3-02 — API Gateway + proteção de rotas](user-stories/f3-02-api-gateway.md)
- [f3-03 — Aplicação como Resource Server (validate-only)](user-stories/f3-03-app-resource-server.md)

### Onda 2 — Infraestrutura de nuvem (Terraform) — 5 dias

Dependência: Onda 0 (RFC nuvem/banco). Precede a Onda 3.

- [f3-04 — Terraform: Banco Gerenciado (RDS)](user-stories/f3-04-terraform-banco-gerenciado.md) → **repo 3**
- [f3-05 — Terraform: Cluster Kubernetes (EKS)](user-stories/f3-05-terraform-cluster-kubernetes.md) → **repo 2**

### Onda 3 — Deploy da aplicação + segregação de repos + CI/CD — 5 dias

Dependência: Ondas 1 e 2.

- [f3-06 — Deploy da aplicação no EKS](user-stories/f3-06-deploy-aplicacao-eks.md) → **repo 4**
- [f3-07 — Segregação em 4 repositórios + branch protection](user-stories/f3-07-segregacao-repositorios.md)
- [f3-08 — CI/CD por repositório com deploy automático](user-stories/f3-08-cicd-multi-repo.md)

### Onda 4 — Observabilidade — 4 dias

Dependência: Onda 3 (app rodando no EKS). Pode iniciar logs estruturados em paralelo.

- [f3-09 — Logs estruturados (JSON) + correlação](user-stories/f3-09-logs-estruturados-correlacao.md)
- [f3-10 — Observabilidade: APM, métricas de infra, uptime](user-stories/f3-10-observabilidade-apm.md)
- [f3-11 — Dashboards e alertas](user-stories/f3-11-dashboards-alertas.md)

### Onda 5 — Documentação arquitetural — 3 dias

Dependência: arquitetura estabilizada (Ondas 1–4). RFCs/ADRs vêm da Onda 0.

- [f3-doc-03 — Diagrama de componentes + diagramas de sequência](user-stories/f3-doc-03-arquitetura-diagramas.md)
- [f3-doc-04 — Justificativa do banco + modelo relacional + ER](user-stories/f3-doc-04-justificativa-banco-er.md)
- [f3-doc-05 — READMEs por repositório](user-stories/f3-doc-05-readmes-por-repo.md)
- [f3-doc-06 — Índice de documentação + revisão do README principal](user-stories/f3-doc-06-indice-docs-readme.md)
- [f3-doc-07 — QA Plans (backfill + Fase 3)](user-stories/f3-doc-07-qa-plans-backfill.md)

### Onda 6 — Entrega — 1 dia

Dependência: tudo pronto.

- [f3-12 — Vídeo (≤15 min) + PDF + `soat-architecture`](user-stories/f3-12-entrega-video-pdf.md)

---

## Índice das histórias

| # | História | Onda | Repo | SP | Prioridade |
|---|---|---|---|---|---|
| f3-doc-01 | RFCs (nuvem, banco, auth) | 0 | 4 (docs) | 3 | Alta |
| f3-doc-02 | ADRs | 0 | 4 (docs) | 2 | Alta |
| f3-01 | Serverless CPF auth (Lambda) | 1 | 1 | 8 | Alta |
| f3-02 | API Gateway + proteção de rotas | 1 | 1/2 | 5 | Alta |
| f3-03 | App como Resource Server | 1 | 4 | 5 | Alta |
| f3-04 | Terraform Banco Gerenciado (RDS) | 2 | 3 | 5 | Alta |
| f3-05 | Terraform Cluster EKS | 2 | 2 | 8 | Alta |
| f3-06 | Deploy da app no EKS | 3 | 4 | 5 | Alta |
| f3-07 | Segregação em 4 repos + branch protection | 3 | todos | 5 | Alta |
| f3-08 | CI/CD por repositório | 3 | todos | 8 | Alta |
| f3-09 | Logs estruturados + correlação | 4 | 4 | 3 | Alta |
| f3-10 | Observabilidade: APM/infra/uptime | 4 | 4/2 | 5 | Alta |
| f3-11 | Dashboards e alertas | 4 | 4 | 5 | Alta |
| f3-doc-03 | Diagramas (componentes + sequência) | 5 | 4 (docs) | 3 | Alta |
| f3-doc-04 | Justificativa do banco + ER | 5 | 4 (docs) | 3 | Alta |
| f3-doc-05 | READMEs por repositório | 5 | todos | 3 | Alta |
| f3-doc-06 | Índice de docs + README principal | 5 | 4 (docs) | 3 | Média |
| f3-doc-07 | QA Plans (backfill + Fase 3) | 5 | 4 (docs) | 5 | Média |
| f3-12 | Entrega: vídeo + PDF + soat-architecture | 6 | todos | 2 | Alta |

**Total:** ~95 SP · 19 histórias.

> Sincronização com o board do Notion: ver
> [f3-notion-import.md](user-stories/f3-notion-import.md).

---

## Cronograma sugerido (1 pessoa, ~23 dias úteis)

```
Dia  1-2   │ Onda 0 (RFCs + ADRs)                 ▓▓
Dia  3-6   │ Onda 1 (Auth serverless + Gateway)   ▓▓▓▓
Dia  4-8   │ Onda 2 (Terraform EKS + RDS)         ▓▓▓▓▓   (paralelo parcial)
Dia  9-13  │ Onda 3 (Deploy + repos + CI/CD)      ▓▓▓▓▓
Dia 14-17  │ Onda 4 (Observabilidade)             ▓▓▓▓
Dia 18-20  │ Onda 5 (Documentação)                ▓▓▓
Dia 21     │ Onda 6 (Vídeo + PDF)                 ▓
Dia 22-23  │ Buffer / correções                   ░░
```

Em grupo, Ondas 1 e 2 correm totalmente em paralelo (times separados por repo).

---

## Estado do repositório no início da Fase 3

### Pronto (herdado da Fase 2)

- Monólito NestJS com DDD/Clean Architecture (contextos delimitados, `architecture.spec.ts`).
- **Autenticação JWT por e-mail/senha** (`POST /auth/login`) com roles ADMIN/ATENDENTE/MECANICO/ESTOQUISTA/CLIENTE.
- Notificação via **webhook outbound** (HMAC).
- **Docker** multi-stage não-root + docker-compose.
- **Kubernetes** (Kustomize): deployment, service, HPA, configmap, secret, migrations-job + UIs admin/cliente.
- **Terraform** 2 estágios: `01-cluster` (kind, com modo EKS via variável) + `02-app` (Postgres in-cluster + secret).
- **CI/CD** único (`ci-cd.yml`) com kind efêmero; workflows de performance (`perf-*.yml`).
- **Health checks**, testes unit/integração/e2e (gate 80%), Swagger, `docs/schema.dbml`.
- Monitoramento **aplicacional** de tempo médio por status (US-17).

### Parcialmente pronto (evoluir na Fase 3)

- **Autenticação** — é por e-mail/senha no monólito; falta a **função serverless por CPF** e o **API Gateway**; o monólito precisa virar **resource server**.
- **Terraform** — existe em modo kind; falta o modo **EKS + RDS real** e a **separação em 2 repos** de infra.
- **CI/CD** — pipeline único num monorepo; falta **4 pipelines** (um por repo) com deploy automático em AWS + branch protection.
- **Documentação de arquitetura** — existe `arquitetura-fase2.md`; faltam **RFCs**, **ADRs**, **diagramas de sequência**, **justificativa formal do banco**.

### Não iniciado

- Function Serverless (Lambda) de autenticação por CPF.
- API Gateway (AWS API Gateway).
- Banco gerenciado (RDS) e cluster EKS provisionados por Terraform.
- Integração de observabilidade (APM, métricas de infra, uptime), **logs JSON com correlação**, dashboards e alertas.
- RFCs, ADRs, diagramas de sequência, justificativa do banco.
- Vídeo, PDF e compartilhamento com `soat-architecture`.

---

## Checklist de entrega (enunciado)

- [ ] 4 repositórios com código, CI/CD e README claro.
- [ ] Cada repo: Dockerfile (quando aplicável), pipeline funcional, link do deploy ativo.
- [ ] README por repo: propósito, tecnologias, execução/deploy, diagrama da arquitetura, link Swagger/Postman.
- [ ] Autenticação por **CPF** funcionando via API Gateway + Lambda.
- [ ] Deploy automatizado (homolog + prod) por PR na `main` protegida.
- [ ] Dashboards de monitoramento com **análise ao vivo** + logs/traces em execução.
- [ ] Vídeo ≤15 min no YouTube/Vimeo (público ou não listado).
- [ ] PDF único: links dos 4 repos, link do vídeo, links das documentações.
- [ ] Usuário **`soat-architecture`** adicionado a **todos** os repositórios.
