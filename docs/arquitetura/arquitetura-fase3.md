# Arquitetura — Fase 3

Desenho da arquitetura da solução evoluída na Fase 3 para a nuvem AWS:
**componentes (visão de nuvem)**, **sequência de autenticação por CPF**,
**sequência de abertura de OS** e **fluxo de deploy dos 4 repositórios**. Os
diagramas estão em [Mermaid](https://mermaid.js.org/) e são renderizados
diretamente pelo GitHub. A Fase 3 é uma **evolução** da
[Arquitetura da Fase 2](arquitetura-fase2.md): a organização interna do
monólito (Clean Architecture + DDD) permanece a mesma; muda a infraestrutura
que o hospeda e a forma de autenticar.

> Para o PDF de entrega, exporte estes diagramas como imagem (por exemplo
> `npx -p @mermaid-js/mermaid-cli mmdc -i docs/arquitetura/arquitetura-fase3.md -o docs/arquitetura/arquitetura-fase3.png`).

---

## 1. Diagrama de Componentes (visão de nuvem)

O **API Gateway é o único ponto público**. As UIs autenticam via `POST /auth`
(Lambda de CPF) e chamam as rotas protegidas com `Authorization: Bearer`; o
gateway valida o token na borda com a mesma Lambda atuando como **Lambda
Authorizer** e encaminha ao monólito por **VPC Link → ALB interno**. O
monólito roda no **EKS** com HPA e lê `DATABASE_URL`/segredo do JWT do
**Secrets Manager**; o banco é **RDS PostgreSQL Multi-AZ** em subnets
privadas. A observabilidade é feita pelo **agente Datadog** no cluster
(APM + infra + logs) com dashboards/alertas na plataforma.

```mermaid
flowchart TB
    subgraph UI["Clientes / UIs"]
        ADMIN["web/admin<br/>(staff: CPF + senha)"]
        CLI["web/cliente<br/>(cliente: só CPF)"]
    end

    subgraph AWS["AWS (conta Academy)"]
        GW["API Gateway (AWS API Gateway HTTP API)<br/>único ponto público<br/>rotas públicas explícitas + ANY /{proxy+}"]
        LAMBDA["Lambda de autenticação por CPF<br/>POST /auth: valida CPF + status do cliente, emite JWT HS256<br/>Lambda Authorizer: valida token na borda"]
        VPCLINK["VPC Link"]

        subgraph VPC["VPC — subnets privadas"]
            ALB["ALB interno<br/>(AWS Load Balancer Controller)"]

            subgraph EKS["Cluster EKS — namespace oficina"]
                DEP["Deployment: oficina-app<br/>monólito NestJS (resource server)"]
                SVC["Service (ClusterIP) :3000"]
                HPA["HPA v2<br/>CPU/mem 70% · min 2 · max 10"]
                JOB["Job: oficina-migrations<br/>prisma migrate deploy"]
                DDAGENT["Agente Datadog<br/>(APM + métricas infra + logs)"]
            end

            RDS[("RDS PostgreSQL<br/>Multi-AZ · subnets privadas")]
        end

        SM["Secrets Manager<br/>segredo compartilhado do JWT<br/>DATABASE_URL"]
        ECR["ECR<br/>imagem da app (tag por commit)"]
        CW["CloudWatch<br/>access logs do gateway"]
    end

    DD["Datadog<br/>dashboards + alertas"]

    ADMIN -- "POST /auth · Bearer JWT" --> GW
    CLI -- "POST /auth · Bearer JWT" --> GW
    GW -- "POST /auth" --> LAMBDA
    GW -. "Lambda Authorizer<br/>(rotas protegidas)" .-> LAMBDA
    GW --> VPCLINK --> ALB --> SVC --> DEP
    HPA -- "escala" --> DEP
    DEP --> RDS
    JOB --> RDS
    LAMBDA -- "consulta cliente/status" --> RDS
    SM -. "segredo JWT" .-> LAMBDA
    SM -. "segredo JWT + DATABASE_URL" .-> DEP
    SM -. "DATABASE_URL" .-> JOB
    ECR -. "pull da imagem" .-> DEP
    ECR -. "pull da imagem" .-> JOB
    DEP -. "traces · métricas · logs JSON<br/>(correlation-id)" .-> DDAGENT
    DDAGENT --> DD
    GW -. "access logs" .-> CW
    CW -. "encaminhados" .-> DD
    DEP -- "webhook outbound (HMAC)" --> EXT["Sistema externo do cliente<br/>(notificação de status)"]
```

---

## 2. Diagrama de Sequência — Autenticação

A **Lambda é o único emissor de JWT** (HS256, segredo compartilhado via
Secrets Manager; claims `sub`, `cpf`, `role`, `iss`, `exp` = 60 min). O
cliente autentica **só com CPF**; o staff usa **CPF + senha** na mesma Lambda.
O token é validado **duas vezes de propósito** — na borda (Lambda Authorizer)
e no app (resource server, que ainda autoriza por role/claim) — defesa em
profundidade.

```mermaid
sequenceDiagram
    autonumber
    actor UI as Cliente / UI<br/>(web/admin · web/cliente)
    participant GW as API Gateway<br/>(HTTP API)
    participant LAMBDA as Lambda de autenticação por CPF
    participant SM as Secrets Manager
    participant RDS as RDS PostgreSQL
    participant APP as App NestJS no EKS<br/>(resource server)

    UI->>GW: POST /auth {cpf} (cliente) ou {cpf, senha} (staff)
    GW->>LAMBDA: invoca handler de autenticação
    LAMBDA->>LAMBDA: valida formato/dígitos do CPF
    LAMBDA->>RDS: consulta existência e status do cliente/usuário pelo CPF
    RDS-->>LAMBDA: registro + role (CLIENTE ou staff)
    alt staff (CPF + senha)
        LAMBDA->>LAMBDA: verifica hash da senha
    end
    LAMBDA->>SM: obtém segredo compartilhado do JWT
    SM-->>LAMBDA: segredo HS256
    LAMBDA-->>GW: 200 { token } — JWT HS256 (sub, cpf, role, iss, exp 60 min)
    GW-->>UI: 200 { token }

    Note over UI,APP: Requisição a rota protegida

    UI->>GW: GET /ordens-servico (Authorization: Bearer JWT)
    GW->>LAMBDA: Lambda Authorizer (REQUEST, payload 2.0, cache 300s)
    LAMBDA->>LAMBDA: valida assinatura, iss e exp na borda
    alt token ausente ou inválido
        LAMBDA-->>GW: isAuthorized = false
        GW-->>UI: 401 Unauthorized (não chega à VPC)
    else token válido
        LAMBDA-->>GW: isAuthorized = true (+ context)
        GW->>APP: encaminha via VPC Link -> ALB interno
        APP->>APP: revalida JWT (assinatura HS256, iss, exp)
        APP->>APP: autoriza por role/claim (ex.: CLIENTE só vê as próprias OS)
        APP-->>GW: 200 payload (ou 403 se a role não permite)
        GW-->>UI: resposta
    end
```

---

## 3. Diagrama de Sequência — Abertura de OS

Entrada **REST síncrona via gateway**; dentro do monólito os bounded contexts
conversam por **eventos in-process (`@OnEvent`)**; a saída para o cliente é
um **webhook outbound com HMAC** emitido pelo contexto de Notificação.

```mermaid
sequenceDiagram
    autonumber
    actor USER as Cliente / Atendente<br/>(autenticado)
    participant GW as API Gateway<br/>(HTTP API)
    participant AUTHZ as Lambda Authorizer
    participant APP as App NestJS no EKS<br/>(Controller + Guards)
    participant UC as Use Case<br/>AbrirOrdemDeServico
    participant REPO as Repositório Prisma
    participant RDS as RDS PostgreSQL
    participant EVT as EventEmitter<br/>(@OnEvent)
    participant NOTIF as Listener de Notificação
    participant EXT as Sistema externo do cliente<br/>(webhook)

    USER->>GW: POST /ordens-servico (Authorization: Bearer JWT)
    GW->>AUTHZ: valida token na borda
    AUTHZ-->>GW: isAuthorized = true
    GW->>APP: encaminha via VPC Link -> ALB interno
    APP->>APP: revalida JWT + autoriza role (ATENDENTE ou CLIENTE)
    APP->>UC: execute(clienteId, veiculoId, descrição)
    UC->>UC: cria aggregate OrdemDeServico (status RECEBIDA)
    UC->>REPO: salvar(ordemDeServico)
    REPO->>RDS: INSERT ordem_de_servico (transação Prisma)
    RDS-->>REPO: OK
    REPO-->>UC: OrdemDeServico persistida
    UC->>EVT: emite domain event OrdemDeServicoAberta
    UC-->>APP: OS criada
    APP-->>GW: 201 Created { id, status: RECEBIDA }
    GW-->>USER: 201 Created

    EVT-->>NOTIF: @OnEvent(OrdemDeServicoAberta)
    NOTIF->>EXT: POST webhook outbound (assinatura HMAC no header)
    EXT-->>NOTIF: 2xx
```

---

## 4. Fluxo de deploy (CI/CD dos 4 repositórios)

Na Fase 2 havia um **pipeline único** que criava um cluster kind efêmero no
runner. Na Fase 3 a solução está segregada em **4 repositórios independentes**,
todos com `main` protegida (PR obrigatório), **CI em todo PR** (testes/lint no
código; `fmt`/`validate`/`plan` no Terraform) e **CD no merge à `main`**
(deploy automático / `apply`). Credenciais AWS ficam apenas em GitHub Actions
Secrets; os **contratos entre repos viajam por outputs/Secrets**.

```mermaid
flowchart LR
    subgraph GH["GitHub — 4 repositórios (main protegida · PR obrigatório · CI no PR · CD no merge)"]
        direction TB
        R1["soat-fiap-oficina-auth-lambda<br/>CI: testes + lint<br/>CD: package + deploy da function"]
        R2["soat-fiap-oficina-infra-k8s<br/>CI: terraform fmt/validate/plan<br/>CD: terraform apply"]
        R3["soat-fiap-oficina-infra-db<br/>CI: terraform fmt/validate/plan<br/>CD: terraform apply"]
        R4["soat-fiap-oficina-mecanica-app<br/>CI: testes unit + integração (gate 80%) + build<br/>CD: build/push imagem + deploy no EKS"]
    end

    subgraph AWS["AWS"]
        direction TB
        L["AWS Lambda<br/>auth por CPF + authorizer"]
        K["EKS + API Gateway<br/>(VPC Link, ALB interno, Datadog agent)"]
        D["RDS PostgreSQL<br/>(Multi-AZ)"]
        E["ECR<br/>imagem da app"]
        subgraph DEPLOY["Deploy da app no EKS"]
            direction TB
            S1["kubectl/kustomize apply -k k8s/"] --> S2["Job de migrations<br/>prisma migrate deploy"] --> S3["rollout Deployment + Service + HPA"]
        end
        SM["Secrets Manager<br/>segredo JWT · DATABASE_URL"]
    end

    R1 -- "CD" --> L
    R2 -- "CD" --> K
    R3 -- "CD" --> D
    R4 -- "CD: docker build + push" --> E
    E --> S1
    R4 -- "CD" --> S1

    D -. "output: DATABASE_URL" .-> SM
    R2 -. "output: listener ARN do ALB interno<br/>-> variável do gateway" .-> K
    L -. "output: ARN da Lambda<br/>-> integração + authorizer do gateway" .-> K
    SM -. "DATABASE_URL + segredo JWT" .-> L
    SM -. "DATABASE_URL + segredo JWT" .-> S2
    SM -. "DATABASE_URL + segredo JWT" .-> S3
```

---

## 5. Legenda / racional

Cada componente ou decisão dos diagramas acima tem origem em uma RFC
([US-F3-DOC-01](../user-stories/f3-doc-01-rfcs.md)) ou ADR
([US-F3-DOC-02](../user-stories/f3-doc-02-adrs.md)):

| Componente / decisão | Diagramas | Origem |
|---|---|---|
| AWS como nuvem (conta Academy) | 1, 4 | [RFC-0001](rfcs/RFC-0001-escolha-da-nuvem.md) |
| RDS PostgreSQL Multi-AZ em subnets privadas; `DATABASE_URL` via Secrets Manager; migrations Prisma apontando para o RDS | 1, 3, 4 | [RFC-0002](rfcs/RFC-0002-escolha-do-banco.md) · [Banco de dados](banco-de-dados.md) |
| Lambda como único emissor de JWT (cliente só CPF, staff CPF + senha); HS256 com segredo compartilhado; claims `sub`/`cpf`/`role`/`iss`/`exp` | 1, 2 | [RFC-0003](rfcs/RFC-0003-estrategia-de-autenticacao.md) |
| REST síncrono via gateway; eventos in-process `@OnEvent` entre bounded contexts; webhook outbound com HMAC; sem broker nesta fase | 1, 3 | [ADR-0001](adr/ADR-0001-padrao-de-comunicacao.md) |
| HPA por CPU/memória 70%, `minReplicas 2` / `maxReplicas 10`, metrics-server | 1, 4 | [ADR-0002](adr/ADR-0002-hpa-autoescalonamento.md) |
| Monólito como resource server (valida assinatura/`iss`/`exp`, autoriza por role/claim); dupla validação borda + app | 1, 2, 3 | [ADR-0003](adr/ADR-0003-app-resource-server.md) |
| Datadog (agente no EKS: APM + infra + logs; dashboards e alertas); access logs do gateway via CloudWatch | 1 | [ADR-0004](adr/ADR-0004-plataforma-de-observabilidade.md) |
| API Gateway HTTP API como único ponto público; Lambda Authorizer (REQUEST, payload 2.0, cache 300s); proxy `ANY /{proxy+}` + rotas públicas explícitas; VPC Link → ALB interno | 1, 2, 3, 4 | [ADR-0005](adr/ADR-0005-api-gateway.md) |
| 4 repositórios `soat-fiap-*`, `main` protegida, CI no PR / CD no merge, contratos via outputs/Secrets | 4 | [ADR-0006](adr/ADR-0006-segregacao-4-repositorios.md) |
| ECR (imagem por commit), ALB interno via AWS Load Balancer Controller, Job de migrations antes do rollout | 1, 4 | [US-F3-06](../user-stories/f3-06-deploy-aplicacao-eks.md) |
| Organização interna do monólito (Clean Architecture + DDD) | 3 | [Arquitetura Fase 2 §1](arquitetura-fase2.md#1-componentes-da-aplicação-clean-architecture--ddd) · [Clean Architecture](clean-architecture.md) |

Índices completos: [RFCs](rfcs/README.md) · [ADRs](adr/README.md) ·
[Plano de execução da Fase 3](../plano-execucao-fase-3.md).
