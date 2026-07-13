# Arquitetura — Fase 2

Desenho da arquitetura da solução evoluída na Fase 2: **componentes da aplicação**,
**infraestrutura provisionada** e **fluxo de deploy**. Os diagramas estão em
[Mermaid](https://mermaid.js.org/) e são renderizados diretamente pelo GitHub.

> Para o PDF de entrega, exporte estes diagramas como imagem (por exemplo
> `npx -p @mermaid-js/mermaid-cli mmdc -i docs/arquitetura/arquitetura-fase2.md -o docs/arquitetura/diagrama.png`).

---

## 1. Componentes da aplicação (Clean Architecture + DDD)

A aplicação é um monólito NestJS organizado por **bounded contexts**, cada um em
três camadas com dependências apontando **para dentro** (Infra → Application →
Domain). O domínio não conhece framework nem ORM; a regra de dependência é
garantida por teste automatizado (`src/shared/architecture.spec.ts`).

```mermaid
flowchart TB
    subgraph Client["Consumidores"]
        SW["Swagger / Postman"]
        EXT["Sistema externo<br/>(webhook aprovacao)"]
    end

    subgraph Infra["Infrastructure — adapters"]
        CTRL["Controllers REST<br/>(+ Guards JWT / Webhook token)"]
        REPO["Repositorios Prisma"]
        NOTIF["Notificador<br/>(mock | webhook outbound)"]
        FILTER["DomainExceptionFilter<br/>(DomainError -> HTTP)"]
    end

    subgraph App["Application — casos de uso"]
        UC["Use Cases (1 metodo execute)"]
        PORTS["Ports / Gateways<br/>(interfaces)"]
        LIST["Listeners de eventos<br/>(@OnEvent)"]
    end

    subgraph Domain["Domain — regra de negocio pura"]
        ENT["Entidades / Aggregates<br/>(OrdemDeServico)"]
        VO["Value Objects<br/>(CPF, Placa, StatusOS)"]
        EVT["Domain Events"]
    end

    SW --> CTRL
    EXT --> CTRL
    CTRL --> UC
    UC --> PORTS
    UC --> ENT
    ENT --> VO
    ENT --> EVT
    PORTS -. implementado por .-> REPO
    PORTS -. implementado por .-> NOTIF
    EVT --> LIST
    LIST --> NOTIF
    REPO --> DB[("PostgreSQL")]
    NOTIF --> WH["Webhook externo<br/>(webhook.site / e-mail gateway)"]
```

**Bounded contexts:** `Atendimento` (Cliente, Veiculo, OrdemDeServico — aggregate root),
`Catalogo` (Servico), `Estoque` (Produto), `Autenticacao` (Usuario/JWT) e
`Notificacao`. A comunicação entre contextos usa *ports* read-only de
anti-corrupção (`application/gateways/consulta.gateways.ts`).

---

## 2. Infraestrutura provisionada (Terraform + Kubernetes)

O provisionamento é feito em **dois estágios de Terraform**. O estágio `01-cluster`
cria o cluster Kubernetes (kind, local — nome `oficina-local`) e o `02-app` cria o
banco de dados e o Secret com a `DATABASE_URL` (senha gerada por `random_password`).
Os manifestos da aplicação são aplicados via `kubectl apply -k k8s/`.

> Para subir todo esse fluxo local em um comando (terraform → build → `kind load`
> → `kubectl apply -k k8s/` → migrations → seeds → metrics-server), use o atalho
> [`scripts/local-k8s-up.sh`](../../scripts/local-k8s-up.sh).

```mermaid
flowchart TB
    subgraph TF["Terraform (infra/terraform)"]
        TF1["01-cluster<br/>provider tehcyx/kind"]
        TF2["02-app<br/>Postgres (PVC+Deployment+Service)<br/>+ Secret oficina-db<br/>(random_password -> DATABASE_URL)"]
    end

    TF1 ==> KIND

    subgraph KIND["Cluster Kubernetes (kind)"]
        direction TB
        subgraph NS["namespace: oficina"]
            CM["ConfigMap<br/>oficina-config<br/>(vars nao sensiveis)"]
            SEC["Secrets<br/>oficina-db (Terraform)<br/>oficina-app (JWT, webhook tokens)"]
            JOB["Job: oficina-migrations<br/>prisma migrate deploy"]
            DEP["Deployment: oficina-app<br/>2 replicas · probes · requests/limits"]
            SVC["Service (ClusterIP)<br/>oficina-app :3000"]
            HPA["HPA v2<br/>CPU 70% / Mem 80%<br/>min 2 · max 10"]
            PG[("Postgres<br/>(Service oficina-mecanica-postgres)")]
        end
    end

    TF2 ==> PG
    TF2 ==> SEC
    CM --> DEP
    SEC --> DEP
    SEC --> JOB
    JOB --> PG
    DEP --> PG
    SVC --> DEP
    HPA -- escala --> DEP
    DEP -- POST outbound --> EXT["Webhook externo<br/>(notificacao de status)"]
```

### Recursos criados pelo Terraform

| Estágio | Recurso | Descrição |
|---|---|---|
| `01-cluster` | `kind_cluster` | Cluster Kubernetes local (control-plane + workers) |
| `02-app` | `kubernetes_namespace` | Namespace da aplicação |
| `02-app` | `kubernetes_persistent_volume_claim` + `kubernetes_deployment` + `kubernetes_service` | Banco PostgreSQL (`postgres:16-alpine`) dentro do cluster |
| `02-app` | `random_password` | Senha do banco gerada aleatoriamente |
| `02-app` | `kubernetes_secret` (`oficina-db`) | `DATABASE_URL` consumida pela app e pelo Job de migrations |

> O modo **cloud** (EKS + RDS) é suportado por variável, mantendo o mesmo
> contrato de `DATABASE_URL` via Secret. Detalhes em
> [`infra/terraform/README.md`](../../infra/terraform/README.md).

---

## 3. Fluxo de deploy (CI/CD)

O pipeline (`.github/workflows/ci-cd.yml`) prova o deploy ponta-a-ponta criando um
cluster kind **efêmero** no runner — um cluster Kubernetes real, atendendo
literalmente ao requisito "deploy no cluster Kubernetes".

```mermaid
flowchart LR
    DEV["git push / PR"] --> GHA["GitHub Actions"]

    subgraph GHA["GitHub Actions — ci-cd.yml"]
        direction TB
        T1["1. Testes<br/>unit + integracao + gate 80%"]
        T2["2. Build da aplicacao<br/>npm run build"]
        T3["3. Build imagem Docker<br/>(tar como artifact)"]
        T4["4. Provisionamento + Deploy"]
        T1 --> T2 --> T3 --> T4
        subgraph T4d["Passo 4 — detalhe"]
            direction TB
            A["terraform apply 01-cluster<br/>(kind)"] --> B["kind load docker-image"]
            B --> C["terraform apply 02-app<br/>(Postgres + Secret)"]
            C --> D["kubectl apply -k k8s/"]
            D --> E["wait Job migrations + rollout"]
            E --> F["smoke test /health · /health/ready"]
        end
        T4 --> T4d
    end

    T4d --> RUN["Aplicacao no cluster<br/>(Deployment + Service + HPA)"]
    LOAD["Carga (perf/ — k6/hey)"] -. dispara .-> RUN
    RUN -- CPU sobe --> HPA["HPA cria replicas<br/>(min 2 -> max 10)"]
```

O diretório [`perf/`](../../perf) contém a suíte de carga/estresse/spike/soak e o
teste de escalabilidade que valida o HPA reagindo à carga (workflows
`perf-*.yml`, sob demanda).
