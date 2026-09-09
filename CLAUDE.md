# Auto Repair Shop Integrated System - Tech Challenge FIAP

## About the project

Back-end MVP for a mid-size auto repair shop system, focused on service order management, clients, vehicles, and parts. Built with NestJS using Domain-Driven Design (DDD), PostgreSQL via Prisma ORM.

**Stack:** NestJS + TypeScript + Prisma + PostgreSQL + Docker
**Architecture:** Layered monolith following tactical DDD

## DDD Documentation (Miro)

The full Event Storming is on the Miro board (ID: `uXjVGwyI88w=`).
The latest version is **Event Storming v3 (30/03)**.

### Bounded Contexts

- **Atendimento** — Cliente, Veiculo, OrdemDeServico (aggregate root)
- **Catalogo** — Servico
- **Estoque** — Produto (parts and supplies), stock movements
- **Autenticacao** — Usuario, JWT
- **Notificacao** — client alert delivery

### Actors

- **Cliente** — approves/rejects budget, tracks OS
- **Atendente** — registers client, opens OS, delivers vehicle
- **Mecanico** — diagnoses, adds services/products, executes
- **Gestor** — manages catalogs, monitors KPIs
- **Sistema** — calculates budget, transitions status, notifies

### Service Order Flow (state machine)

```
RECEBIDA -> EM_DIAGNOSTICO -> AGUARDANDO_APROVACAO -> EM_EXECUCAO -> FINALIZADA -> ENTREGUE
                                      |
                                      v
                                  CANCELADA
```

**Automatic transitions (Policies):**
- Mechanic assigns themselves to OS -> status changes to EM_DIAGNOSTICO
- Mechanic completes budget -> AGUARDANDO_APROVACAO + notifies client
- Client approves -> EM_EXECUCAO
- Client rejects -> CANCELADA + reverses inventory reservations
- All services completed -> FINALIZADA
- When execution starts -> inventory deduction for products

## User Stories

User stories are in `docs/user-stories/` and also on the Notion board (Tech Challenge Board).

### Sprint 1 — Foundation + Independent CRUDs (19 SP)

| # | Story | SP | Module |
|---|---|---|---|
| US-00 | Setup Prisma + PostgreSQL | 5 | Infrastructure |
| US-21 | Docker and Infrastructure | 3 | Infrastructure |
| US-01 | Client Registration | 3 | Atendimento |
| US-04 | Service Catalog | 3 | Catalogo |
| US-05 | Product Catalog | 5 | Estoque |

### Sprint 2 — Complementary CRUD + OS Opening

| # | Story | SP | Module |
|---|---|---|---|
| US-02 | Full Client CRUD | 3 | Atendimento |
| US-03 | Vehicle Registration | 3 | Atendimento |
| US-06 | Service Order Opening | 5 | Atendimento |
| US-19 | JWT Authentication | 5 | Autenticacao |

### Sprint 3 — OS Flow (diagnosis to approval)

| # | Story | SP | Module |
|---|---|---|---|
| US-07 | Assign Mechanic to OS | 2 | Atendimento |
| US-08 | Diagnosis | 3 | Atendimento |
| US-09 | Add Services to OS | 3 | Atendimento |
| US-10 | Add Products to OS | 5 | Atendimento + Estoque |
| US-11 | Automatic Budget Calculation | 3 | Atendimento |
| US-12 | Complete and Send Budget | 3 | Atendimento |

### Sprint 4 — Execution, delivery, and extras

| # | Story | SP | Module |
|---|---|---|---|
| US-13 | Budget Approval/Rejection | 5 | Atendimento |
| US-14 | Service Execution | 5 | Atendimento |
| US-15 | Completion and Delivery | 2 | Atendimento |
| US-16 | Client OS Tracking | 3 | Atendimento |
| US-18 | Inventory Control | 5 | Estoque |

### Sprint 5 — Monitoring, tests, and finalization

| # | Story | SP | Module |
|---|---|---|---|
| US-17 | OS Listing + Average Time Monitoring | 5 | Atendimento |
| US-20 | Client Notification | 3 | Notificacao |
| US-22 | Automated Tests (80% coverage) | 8 | All |
| US-23 | Swagger Documentation | 2 | All |

### Fase 2 — Quality, Resilience & Scalability (`f2-*`)

Refactor to Clean Architecture, API tweaks, webhook notification, Docker review,
Kubernetes manifests, Terraform (cluster + DB), CI/CD and load tests. Stories in
`docs/user-stories/f2-*.md`. Plan: `docs/plano-execucao-fase-2.md`.

### Fase 3 — Cloud, Security & Observability (`f3-*`)

Serverless CPF auth + API Gateway, AWS cloud infra (EKS/RDS via Terraform),
4-repo split with per-repo CI/CD, observability, and formal architecture docs.
Full plan (gap analysis, decisions, 4-repo map, waves): `docs/plano-execucao-fase-3.md`.
Notion import manifest: `docs/user-stories/f3-notion-import.md`.

| # | Story | SP | Wave | Repo |
|---|---|---|---|---|
| US-F3-DOC-01 | RFCs (cloud, DB, auth) | 3 | 0 | app/docs |
| US-F3-DOC-02 | ADRs (comm pattern, HPA, ...) | 2 | 0 | app/docs |
| US-F3-01 | Serverless CPF Authentication (Lambda) | 8 | 1 | lambda |
| US-F3-02 | API Gateway + route protection | 5 | 1 | lambda/infra-k8s |
| US-F3-03 | App as Resource Server (validate-only) | 5 | 1 | app |
| US-F3-04 | Terraform: Managed Database (RDS) | 5 | 2 | infra-db |
| US-F3-05 | Terraform: Kubernetes Cluster (EKS) | 8 | 2 | infra-k8s |
| US-F3-06 | Application deploy on EKS | 5 | 3 | app |
| US-F3-07 | 4-repo split + branch protection | 5 | 3 | all |
| US-F3-08 | Per-repo CI/CD with auto deploy | 8 | 3 | all |
| US-F3-09 | Structured JSON logs + correlation | 3 | 4 | app |
| US-F3-10 | Observability: APM, infra metrics, uptime | 5 | 4 | app/infra-k8s |
| US-F3-11 | Dashboards & alerts | 5 | 4 | app |
| US-F3-DOC-03 | Component + sequence diagrams | 3 | 5 | app/docs |
| US-F3-DOC-04 | DB justification + relational model + ER | 3 | 5 | app/docs |
| US-F3-DOC-05 | Per-repo READMEs | 3 | 5 | all |
| US-F3-DOC-06 | Docs index + main README overhaul | 3 | 5 | app/docs |
| US-F3-DOC-07 | QA Plans (backfill + Fase 3) | 5 | 5 | app/docs |
| US-F3-12 | Delivery: video + PDF + soat-architecture | 2 | 6 | all |

**Phase 3 repos:** `soat-fiap-oficina-auth-lambda` (1), `soat-fiap-oficina-infra-k8s` (2),
`soat-fiap-oficina-infra-db` (3), `soat-fiap-oficina-mecanica-app` (4, this repo).

## Working with user stories

When starting a task, read the corresponding file in `docs/user-stories/` for full context.

Example:
- "Implement US-06" -> read `docs/user-stories/06-abertura-os.md` and follow the acceptance criteria
- "What's the next task?" -> check the current sprint in the table above

Each user story contains:
- **User story** in the format "As [actor], I want [action], so that [benefit]"
- **Acceptance criteria** as a checklist
- **DDD Domain** and **DDD Layer** indicating where to implement
- **Story Points** and **Priority**

## QA Plan (mandatory)

Every User Story must have a corresponding **QA_PLAN** document in `docs/qa-plans/`. The QA Plan documents how to test the story and ensures all acceptance criteria are validated.

- **Format:** `docs/qa-plans/QA_PLAN_US-XX.md`
- **When to create:** after implementing the story, use the `/qa-plan XX` skill
- **Required content:**
  - Summary of what is being tested
  - Prerequisites (environment, data, configurations)
  - Test scenarios with detailed steps for each acceptance criterion
  - Edge cases (invalid inputs, boundary values)
  - Traceability table (acceptance criterion -> test scenarios)
  - Validation checklist
- **Rule:** each acceptance criterion must have at least one corresponding test scenario

## Entity Relationship Diagram

The file `docs/schema.dbml` contains the full ER diagram in DBML format. It can be imported at [dbdiagram.io](https://dbdiagram.io) to visualize all table relationships. Use it as a reference when implementing new entities or modifying the Prisma schema.

## Expected project structure (after Sprint 1)

```
src/
├── main.ts
├── app.module.ts
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── cliente/
│   ├── cliente.module.ts
│   ├── domain/
│   │   ├── cliente.entity.ts
│   │   └── cliente.repository.ts      # interface
│   ├── application/
│   │   └── cliente.service.ts
│   └── infrastructure/
│       ├── cliente.controller.ts
│       ├── dto/
│       └── prisma-cliente.repository.ts
├── servico/
│   └── ...  (same structure)
└── produto/
    └── ...  (same structure)
```

## Conventions

- **Ubiquitous Language** — use domain terms: OrdemDeServico (not "ticket"), Produto (not "peca"), Cliente, Veiculo
- **Validations** — CPF/CNPJ and license plate must be validated in the domain (Value Objects)
- **OS Status** — use enum: RECEBIDA, EM_DIAGNOSTICO, AGUARDANDO_APROVACAO, EM_EXECUCAO, FINALIZADA, ENTREGUE, CANCELADA
- **APIs** — RESTful, documented with Swagger decorators
- **Database** — PostgreSQL, rationale: robust ACID transaction support, rich data types, maturity
- **Tests** — minimum 80% coverage on critical domains

## Available MCP Servers

- **Notion** — create/read/update tasks on the "Tech Challenge Board"
- **Miro** — read the Event Storming from board `uXjVGwyI88w=`

Database Notion ID: `33a48f0b-bca5-805d-ac88-ed5a914239b0`
Data Source ID: `33a48f0b-bca5-8071-a6bd-000bcbd098d7`
