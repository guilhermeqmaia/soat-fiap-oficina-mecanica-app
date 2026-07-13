# Plano de Execução — Fase 2 Tech Challenge

Organizado em ondas com dependências claras. Estimativas em dias-ideais de uma pessoa.

Referência do enunciado: [tech-challenges/fase-2-tech-challenge.pdf](tech-challenges/fase-2-tech-challenge.pdf)

---

## Decisões prévias

Tomar antes de começar — afetam o escopo das ondas seguintes.

| # | Decisão | Recomendação | Por quê |
|---|---|---|---|
| 1 | Onde rodará o cluster K8s **e o banco** | `kind` (local) com Postgres provisionado via Terraform (manifests `kubernetes_*`) dentro do cluster | PDF exige Terraform para cluster **e DB**. Roda 100% local, sem custo de cloud |
| 2 | Container registry | GHCR (`ghcr.io`) | Já vem com GitHub Actions, sem credenciais extras |
| 3 | Mecanismo de notificação externa | Webhook outbound (HTTP POST para serviço externo tipo webhook.site) | Professor confirmou que webhook atende o requisito; evita acoplar a app a SMTP/Mailhog |
| 4 | Arquitetura escolhida no refactor | Manter DDD em camadas (já está) + documentar como Clean Architecture | O código já respeita as dependências, só precisa formalizar na documentação |

---

## Onda 1 — Ajustes de API (2 dias)

Sem dependência. Começa imediatamente.

**Objetivo:** fechar os 3 gaps funcionais que o PDF cobra explicitamente.

### US-F2-01 — Listagem ordenada de OS (0.5d)

- Editar `prisma-ordem-de-servico.repository.ts` (`findAll`)
- `WHERE status NOT IN (FINALIZADA, ENTREGUE)` por padrão (pode ter override via query param)
- Ordenação custom com `CASE WHEN` no `ORDER BY` (raw SQL ou enum-ordering): `EM_EXECUCAO > AGUARDANDO_APROVACAO > EM_DIAGNOSTICO > RECEBIDA`, mais antigas primeiro
- Atualizar testes de integração e e2e + Swagger

### US-F2-02 — Webhook de aprovação de orçamento (1d)

- Novo endpoint `POST /webhooks/ordens-servico/:id/aprovacao` (controller separado `webhooks.controller.ts`)
- Auth via header `X-Webhook-Token` (Secret) — `@Public()` + guard próprio, não JWT
- Body: `{ aprovado: boolean, motivo?: string }`
- Reaproveita `service.aprovarOrcamento` / `service.reprovarOrcamento`

### US-F2-03 — Adapter Webhook outbound (0.5d)

- Novo `WebhookNotificador implements Notificador` ao lado de `mock-notificador.adapter.ts`
- HTTP POST para URL configurada via `NOTIFICATION_WEBHOOK_URL` (apontar para webhook.site/requestbin durante o demo)
- Header `X-Signature` com HMAC-SHA256 do body usando `NOTIFICATION_WEBHOOK_SECRET`
- Provider escolhido por env `NOTIFICATION_PROVIDER=mock|webhook`
- Falhas de entrega apenas logam, sem quebrar o fluxo principal

---

## Onda 2 — Revisão do container (0.5 dia)

Dependência: nenhuma. Pode rodar em paralelo com Onda 1.

- Revisar `Dockerfile`: multi-stage (builder + runtime slim), usuário não-root, `HEALTHCHECK`
- Revisar `docker-compose.yml`: named volumes, `depends_on` com healthcheck
- Adicionar `.dockerignore` se faltar
- Imagem final: alpine + apenas `dist/`, `node_modules`, `prisma/`

---

## Onda 3 — Manifestos Kubernetes da aplicação (2 dias)

Dependência: Onda 2 (imagem Docker pronta) + Onda 4 (cluster + DB já provisionados via Terraform).

Os manifestos cobrem **apenas a aplicação** — o Postgres é responsabilidade do Terraform (PDF exige IaC para cluster + DB).

Criar `k8s/` com:

```
k8s/
├── namespace.yaml
├── configmap.yaml          # vars não-sensíveis
├── secret.yaml.example     # JWT_SECRET, DATABASE_URL, WEBHOOK_APPROVAL_TOKEN, NOTIFICATION_WEBHOOK_SECRET
├── app/
│   ├── deployment.yaml     # 2 réplicas, probes, resources
│   ├── service.yaml        # ClusterIP
│   ├── ingress.yaml        # opcional
│   └── hpa.yaml            # CPU 70%, min=2 max=10
├── migrations-job.yaml     # Job que roda `prisma migrate deploy`
└── kustomization.yaml
```

A app consome `DATABASE_URL` do Secret — funciona tanto com Postgres dentro do cluster (kind/local) quanto RDS externo (cloud).

---

## Onda 4 — Terraform: Cluster + Banco (3 dias)

Dependência: nenhuma. Roda em paralelo com Ondas 1 e 2 e **precede** a Onda 3.

**PDF exige Terraform para cluster K8s E banco de dados** — não é opcional. O provisionamento roda **100% local** (sem cloud):

| Modo | Cluster | Banco |
|---|---|---|
| **local** | `kind` via provider `tehcyx/kind` | PostgreSQL via Terraform (`kubernetes_deployment`/`service`/`pvc`) dentro do cluster |

Estrutura:

```
infra/terraform/
├── README.md               # o que cria, como aplicar
├── main.tf
├── variables.tf
├── outputs.tf              # kubeconfig_path, database_endpoint, app_namespace
├── versions.tf
├── cluster.tf              # kind ou EKS conforme cloud_provider
├── database.tf             # postgres no cluster ou RDS
├── kubernetes.tf           # namespace, secret (DATABASE_URL gerada), configmap
└── terraform.tfvars.example
```

Senha do banco gerada via `random_password` → escrita em `kubernetes_secret` → consumida pela app.

Manter `infra/sonar/` como está (não conflita com novo `infra/terraform/`).

---

## Onda 5 — CI/CD com verificação de deploy (1.5 dia)

Dependência: Ondas 3 e 4 (manifestos + Terraform prontos).

**Escopo:** sem deploy em cloud permanente. O pipeline **prova que o deploy funciona** criando um cluster `kind` efêmero no runner e rodando o fluxo ponta a ponta (Terraform → manifestos → smoke test). Kind é um cluster K8s real, então atende literalmente o requisito do PDF "Deploy no cluster Kubernetes".

Criar `.github/workflows/ci-cd.yml`:

```yaml
jobs:
  test:           # já existe (reaproveitar de security.yml)
  build-image:    # docker build + push ghcr.io
  verify-deploy:  # kind efêmero no runner
    needs: [test, build-image]
    steps:
      - setup kind (helm/kind-action)
      - terraform apply -var="cloud_provider=local"  (provisiona DB no kind)
      - kind load docker-image <img>
      - kubectl apply -k k8s/
      - kubectl wait deployment + job de migrations
      - smoke test: curl /health (port-forward)
      - upload logs como artifact em caso de falha
```

Mesma sequência de comandos será usada no vídeo da Onda 7 (rodando localmente ou via `workflow_dispatch`).

Deploy em cloud real fica como passo futuro, fora do escopo desta fase.

---

## Onda 6 — Documentação + diagrama (1 dia)

Dependência: tudo acima decidido.

- **Desenho de arquitetura** — usar Excalidraw ou draw.io, exportar `.png` + fonte para `docs/arquitetura/`. Mostrar:
  1. Componentes da app (camadas Nest, módulos por bounded context)
  2. Infra provisionada (cluster, pods, service, ingress, DB, secrets)
  3. Fluxo de deploy (push → CI → build image → terraform apply → kubectl apply → HPA escalando)
- **README.md** — adicionar seções:
  - Objetivos da Fase 2
  - Diagrama (imagem inline)
  - Execução local (já existe — só revisar)
  - Deploy K8s (`kubectl apply -k k8s/`)
  - Provisionamento Terraform (`terraform init/plan/apply`)
  - Link Swagger público (Cloudflare Tunnel ou ngrok temp para o vídeo)
  - Link do vídeo

---

## Onda 7 — Testes de carga e escalabilidade (1.5 dia)

Dependência: Ondas 3 (manifestos K8s + HPA), 4 (Terraform cluster + DB) e 5 (CI/CD com kind efêmero). **Precede a Onda 8 (entrega)** — os testes de carga geram a evidência que alimenta o vídeo.

**Objetivo:** provar que o sistema aguenta volume alto de requests e **escala sozinho via HPA sem falhar**, formalizando a validação ad-hoc do vídeo (Onda 8, passos `hey`/`ab` + "ver HPA criando pods") como testes reproduzíveis com SLOs versionados como código.

Ver [US-F2-11](user-stories/f2-11-testes-carga-escalabilidade.md).

- Suite de performance em `perf/` com **k6** (thresholds nativos que reprovam com exit code != 0) e **autocannon**/`hey` para smoke rápido
- Cinco tipos de teste: **load** (carga sustentada), **stress** (achar o ponto de ruptura, com gate de regressão mínimo), **spike** (pico súbito), **soak/endurance** (detectar memory leak; memória do pod via `kubectl top`, não pelo k6) e **escalabilidade** (assert do HPA reagindo à carga — replicas > min rumo a máx, e voltando a min)
- SLOs de partida (p95/p99, nunca média): `http_req_failed < 1%` (429 conta como falha, pois o throttler está off); reads p95 < 500ms / p99 < 1000ms; writes p95 < 800ms / p99 < 1500ms
- **Tratar o throttler** (`@nestjs/throttler` global 100 req/60s): **implementar o hook `THROTTLER_DISABLED=true`** em `src/app.module.ts` (pré-requisito de código) e subir a app-alvo com ele; passo de sanidade anti-429. Cenário separado valida o próprio throttler (429 sob abuso, throttler ligado)
- **HPA em kind:** instalar `metrics-server` com `--kubelet-insecure-tls` e **aguardar readiness + `TARGETS` sair de `<unknown>`** antes de medir; gerar carga contra endpoint que satura a CPU do POD (validar com `kubectl top pod`, ou usar HPA por memória como gatilho alternativo); **reconciliar nomes** (`mecanica`->`oficina`, `mecanica-app`->`app`, HPA min=1/máx=3 -> min=2/máx=10) e deployar via `kubectl apply -k k8s/`; asserts com limiar numérico + janela temporal (scale-up >= N replicas em T s; scale-down volta a min sem thrashing); SLO de erro/latência mantido **durante** o rollout ("sem falhar")
- CI **on-demand** (`.github/workflows/perf-test.yml`, `workflow_dispatch` com input `test_type`) — nunca no push/PR padrão; no runner (kind single-node, 2 vCPU) prova o **mecanismo** do HPA, não a capacidade real de 10 réplicas; relatórios JSON/HTML como artefato + resumo no `$GITHUB_STEP_SUMMARY`
- load/stress/spike/soak completos rodam **local** (docker compose) como fonte-de-verdade; no CI apenas versões curtas (smoke + load 1-2min)
- Documentar no README como rodar localmente; a suite **não conta** para o gate de 80% de cobertura

Alimenta diretamente o vídeo da Onda 8 (etapa "gerar carga → ver HPA criando pods").

---

## Onda 8 — Entrega final (0.5 dia)

Dependência: Onda 7 (evidência de carga/HPA) + tudo pronto.

- **Vídeo (≤15min)** — roteiro:
  1. Deploy via CI/CD
  2. Ver pods subindo (`kubectl get pods -w`)
  3. Consumir 4-5 APIs via Postman / Swagger
  4. Gerar carga com `hey` ou `ab`
  5. Ver HPA criando pods
- **PDF de entrega** com: link do repo (+ convidar `soat-architecture`), imagem do diagrama, link do vídeo
- Compartilhar repo com usuário `soat-architecture`

---

## Cronograma sugerido (1 pessoa, ~12-13 dias úteis)

```
Dia  1-2   │ Onda 1 (APIs)                    ▓▓▓▓
Dia  1     │ Onda 2 (Docker)                  ▓           (paralelo)
Dia  2-4   │ Onda 4 (Terraform cluster+DB)    ▓▓▓▓▓▓      (precede Onda 3)
Dia  5-6   │ Onda 3 (K8s da app)              ▓▓▓▓
Dia  7-8   │ Onda 5 (CI/CD)                   ▓▓▓
Dia  9     │ Onda 6 (Docs + diag)             ▓▓
Dia 10-11  │ Onda 7 (Carga + escalabilidade)  ▓▓▓
Dia 12     │ Onda 8 (Vídeo + PDF)             ▓
Dia 13     │ Buffer / correções               ░░
```

---

## Estado do repositório no início da Fase 2

### Pronto

- Refactor com camadas separadas (DDD) em `src/`
- Testes unitários + integração + gate 80% no CI (`.github/workflows/security.yml`)
- API: Abertura de OS (`ordem-de-servico.controller.ts`)
- API: Consulta de status (`GET /ordens-servico/:id`)
- Dockerfile + docker-compose básicos
- Swagger em `http://localhost:3000/api`

### Parcialmente pronto

- **Listagem de OS** — só ordena por `createdAt:desc`, sem filtro de status nem ordem custom
- **Aprovação de orçamento** — existe `POST /:id/aprovar-orcamento` autenticado por JWT de cliente; falta endpoint webhook externo
- **Notificação externa** — só existe `MockEmailNotificador` (loga no console). Solução: webhook outbound
- **CI/CD** — só build + testes + coverage; falta build/push de imagem e job de `verify-deploy` rodando o fluxo em kind efêmero
- **README** — falta arquitetura, instruções K8s, instruções Terraform, link Postman, link do vídeo

### Não iniciado

- Manifestos Kubernetes da aplicação (`k8s/`)
- Terraform para cluster K8s + banco de dados (`infra/terraform/`)
- Desenho de arquitetura
- Vídeo demonstrativo
- PDF final de entrega
