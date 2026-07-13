# Oficina Mecânica — API

Back-end MVP para sistema integrado de oficina mecânica, focado em gestão de ordens de serviço, clientes, veículos e peças.

**Stack:** NestJS · TypeScript · Prisma · PostgreSQL · Docker · Kubernetes · Terraform · JWT

---

## Fase 2 — Qualidade, Resiliência e Escalabilidade

A Fase 2 evolui o MVP da Fase 1 para **qualidade, resiliência e escalabilidade**,
incorporando práticas modernas de infraestrutura e automação:

- **Refatoração** do código aplicando **Clean Code** e **Clean Architecture** —
  camadas Domain/Application/Infrastructure com dependências apontando para o
  domínio, garantidas por teste automatizado (`src/shared/architecture.spec.ts`).
- **APIs** de abertura de OS, consulta de status, **listagem ordenada por
  prioridade de status** e **webhook externo de aprovação/reprovação** de orçamento.
- **Notificação externa** de mudança de status via **webhook outbound** (HMAC).
- **Containerização** revisada (Dockerfile multi-stage não-root + docker-compose).
- **Orquestração Kubernetes** com Deployments, Services, ConfigMaps, Secrets e
  **HPA** (autoescalonamento por CPU/memória).
- **Infraestrutura como Código** com **Terraform** provisionando cluster + banco.
- **CI/CD** que builda, testa, empacota a imagem e faz deploy ponta-a-ponta em um
  cluster Kubernetes.

### Desenho da arquitetura

Diagramas de **componentes da aplicação**, **infraestrutura provisionada** e
**fluxo de deploy** (renderizados pelo GitHub):

➡️ **[docs/arquitetura/arquitetura-fase2.md](docs/arquitetura/arquitetura-fase2.md)**

### Entregáveis da Fase 2

| Entregável | Onde |
|---|---|
| Desenho da arquitetura | [`docs/arquitetura/arquitetura-fase2.md`](docs/arquitetura/arquitetura-fase2.md) |
| Manifestos Kubernetes | [`k8s/`](k8s) · [`k8s/README.md`](k8s/README.md) |
| Scripts Terraform (IaC) | [`infra/terraform/`](infra/terraform) · [`infra/terraform/README.md`](infra/terraform/README.md) |
| Pipeline CI/CD | [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) |
| Testes de carga / escalabilidade | [`perf/`](perf) · [`perf/README.md`](perf/README.md) |
| Collection das APIs (Swagger/OpenAPI) | `http://localhost:3000/api` (com a app rodando) — ver [Collection das APIs](#collection-das-apis) |
| Vídeo demonstrativo (≤15 min) | ⚠️ **TODO:** adicionar link do YouTube/Vimeo antes da entrega |

---

## Pré-requisitos

- [Node.js 20+](https://nodejs.org/)
- [Docker](https://www.docker.com/) e Docker Compose

---

## Rodando com Docker Compose (recomendado)

Sobe a aplicação e o banco de dados juntos. **As migrations (incluindo a migration de seed dos usuários de teste) são aplicadas automaticamente na inicialização do container.**

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd software-architecture-tech-challenge-01

# 2. Configure o .env (JWT_SECRET é obrigatória)
cp .env.example .env

# 3. Suba os containers
docker compose up -d

# 4. Acompanhe os logs (opcional)
docker compose logs -f app
```

A API estará disponível em `http://localhost:3000`.
A documentação Swagger estará em `http://localhost:3000/api`.

### Parar os containers

```bash
docker compose down
```

Para remover também o volume do banco de dados:

```bash
docker compose down -v
```

---

## Variáveis de ambiente

Copie `.env.example` para `.env` (usado apenas em execução local sem Docker):

```bash
cp .env.example .env
```

| Variável | Descrição | Default |
|---|---|---|
| `DATABASE_URL` | String de conexão PostgreSQL | `postgresql://postgres:postgres@localhost:5432/oficina_mecanica?schema=public` |
| `PORT` | Porta da API | `3000` |
| `JWT_SECRET` | **Obrigatória.** Chave secreta do JWT | — (a app falha em iniciar sem esta variável) |
| `JWT_EXPIRES_IN` | Expiração do token | `1h` |
| `PUBLIC_BASE_URL` | URL pública usada nos links enviados em notificações | `http://localhost:3000` |
| `NOTIFICATION_PROVIDER` | Adapter de notificação: `mock` ou `webhook`. Sem valor, usa `mock` em desenvolvimento e `webhook` em produção | `mock` em dev, `webhook` em prod |
| `NOTIFICATION_WEBHOOK_URL` | URL de destino do POST outbound de notificação. Para demo, use uma URL de `https://webhook.site/` ou RequestBin | — |
| `NOTIFICATION_WEBHOOK_SECRET` | Segredo usado para gerar o header `X-Signature: sha256=<hmac>` com HMAC-SHA256 do body | — |
| `NOTIFICATION_WEBHOOK_TIMEOUT_MS` | Timeout do POST outbound | `5000` |

> **Importante:** `JWT_SECRET` é obrigatória. Antes de subir os containers, copie `.env.example` para `.env` ou defina a variável no seu shell. Exemplo:
>
> ```bash
> cp .env.example .env
> # edite .env e coloque um valor forte em JWT_SECRET
> ```

### Notificação por webhook outbound

Para demonstrar notificações sem infraestrutura própria de e-mail/SMS/push, a aplicação pode publicar mudanças de status da OS em um webhook externo.

1. Abra `https://webhook.site/` ou um RequestBin e copie a URL gerada.
2. Configure o `.env`:

```bash
NOTIFICATION_PROVIDER=webhook
NOTIFICATION_WEBHOOK_URL=https://webhook.site/<token-gerado>
NOTIFICATION_WEBHOOK_SECRET=segredo-usado-no-video
NOTIFICATION_WEBHOOK_TIMEOUT_MS=5000
```

Quando a OS mudar de status, a API envia `POST` com `Content-Type: application/json` e `X-Signature: sha256=<hmac>`. O body contém `ordemId`, `clienteId`, `statusAnterior`, `statusAtual`, `timestamp` e `tipoNotificacao`. Falhas de entrega, timeout e respostas 4xx/5xx são registradas em log e não bloqueiam o fluxo principal da OS.

---

## Autenticação

A API usa JWT para proteger endpoints administrativos. Endpoints marcados com `@Public()` não requerem autenticação.

### Usuários de teste (apenas desenvolvimento)

> ⚠️ **Somente para desenvolvimento.** Estes usuários têm senhas conhecidas e
> **nunca** devem existir em produção. Eles **não** são mais criados pelas
> migrations (`prisma migrate deploy` não semeia nada). Para popular um banco de
> dev com dados de demonstração + estes usuários, rode:
>
> ```bash
> npm run seed   # recusa rodar com NODE_ENV=production
> ```
>
> Em produção, crie o administrador inicial por um canal seguro/manual.

| Role | Email | Senha (dev) |
|---|---|---|
| ADMIN | `admin@oficina.com` | `admin123` |
| ATENDENTE | `atendente@oficina.com` | `atendente123` |
| MECANICO | `mecanico@oficina.com` | `mecanico123` |
| ESTOQUISTA | `estoquista@oficina.com` | `estoquista123` |
| CLIENTE | `cliente@oficina.com` | `cliente123` |

### Fazendo login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@oficina.com","senha":"admin123"}'
```

Resposta:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": {
    "id": "uuid",
    "nome": "Admin Oficina",
    "email": "admin@oficina.com",
    "role": "ADMIN"
  }
}
```

### Usando o token

Inclua o header `Authorization: Bearer <token>` nas requisições a endpoints protegidos:

```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer <token>"
```

No Swagger (`http://localhost:3000/api`), clique em **Authorize** e cole o token.

---

## Rodando localmente (sem Docker)

### 1. Instale as dependências

```bash
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

### 3. Suba apenas o banco de dados

```bash
docker compose up -d postgres
```

### 4. Execute as migrations

```bash
npm run prisma:migrate
```

> A migration `99999999999999_seed_test_users` já popula os usuários de teste automaticamente.

### 5. Inicie a aplicação

```bash
# Desenvolvimento (com hot reload)
npm run start:dev

# Produção
npm run build
npm start
```

A API estará disponível em `http://localhost:3000`.
A documentação Swagger estará em `http://localhost:3000/api`.

---

## Subir tudo localmente (kind) com um comando

Para desenvolvimento/demonstração, um script executa **todo o fluxo de ponta a
ponta** em um cluster [kind](https://kind.sigs.k8s.io/) local: provisiona
**cluster + banco** (Terraform), **builda** as imagens da API e das duas UIs,
carrega no cluster, aplica os **manifestos**, roda as **migrations**, aplica os
**seeds** de demonstração e instala o **metrics-server** (necessário para o HPA).

```bash
# Pré-requisitos: docker, kubectl e terraform (o kind é instalado via Homebrew se faltar)
bash scripts/local-k8s-up.sh
```

Em outro terminal, abra os acessos (mantém os `port-forward` ativos):

```bash
bash scripts/local-k8s-forward.sh
# API:     http://localhost:3000   (Swagger em /api quando NODE_ENV != production)
# Admin:   http://localhost:8080
# Cliente: http://localhost:8081
```

> Para usar o `kubectl` manualmente neste cluster:
> `export KUBECONFIG=$HOME/.kube/oficina-mecanica.config` (contexto
> `kind-oficina-local`). As duas seções a seguir detalham **o mesmo fluxo passo a
> passo** — úteis para entender o que o script faz ou para rodar de forma manual.

---

## Provisionamento da infraestrutura com Terraform

O Terraform provisiona o **cluster Kubernetes** e o **banco de dados** em dois
estágios. Detalhes completos e o modo cloud (EKS + RDS) em
[`infra/terraform/README.md`](infra/terraform/README.md).

```bash
# Pré-requisitos: terraform >= 1.9, docker e kubectl

# Estágio 1 — cria o cluster kind e escreve o kubeconfig
cd infra/terraform/01-cluster
terraform init
terraform apply            # gera ~/.kube/oficina-mecanica.config

# Estágio 2 — cria o Postgres e o Secret oficina-db (DATABASE_URL)
cd ../02-app
terraform init
terraform apply            # senha do banco gerada via random_password
```

Recursos criados (resumo): `kind_cluster`, `kubernetes_namespace`, Postgres
(`PVC` + `Deployment` + `Service`), `random_password` e `kubernetes_secret`
(`oficina-db`). Ver a tabela completa em
[docs/arquitetura/arquitetura-fase2.md](docs/arquitetura/arquitetura-fase2.md#recursos-criados-pelo-terraform).

---

## Deploy em Kubernetes

Os manifestos da aplicação estão em [`k8s/`](k8s) (Kustomize). Detalhes em
[`k8s/README.md`](k8s/README.md).

> Para rodar todo este fluxo de uma vez em um cluster kind local, use
> `bash scripts/local-k8s-up.sh` (ver [Subir tudo localmente (kind) com um
> comando](#subir-tudo-localmente-kind-com-um-comando)). Os passos abaixo são o
> mesmo fluxo, manual.

```bash
# Aponte o kubectl para o cluster provisionado pelo Terraform
export KUBECONFIG=$HOME/.kube/oficina-mecanica.config

# Crie o Secret da aplicação a partir do exemplo (JWT + tokens de webhook)
cp k8s/secret.yaml.example k8s/secret.yaml   # edite os valores

# (kind) carregue a imagem no cluster (nome do cluster: oficina-local)
kind load docker-image oficina-mecanica-app:latest --name oficina-local

# Aplique todos os manifestos (namespace, configmap, secret, migrations, app, service, hpa)
kubectl apply -k k8s/

# Acompanhe o Job de migrations e o rollout
kubectl wait --for=condition=complete job/oficina-migrations -n oficina --timeout=180s
kubectl rollout status deployment/oficina-app -n oficina

# HPA (requer metrics-server no cluster)
kubectl get hpa -n oficina
```

O deploy contempla **Deployment** (2 réplicas, probes, requests/limits),
**Service** (ClusterIP), **ConfigMap** + **Secret**, **Job de migrations**
(`prisma migrate deploy`) e **HPA** (CPU 70% / memória 80%, min 2 / máx 10).

> O mesmo fluxo (Terraform → imagem → `kubectl apply -k`) roda automaticamente no
> pipeline [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) contra um
> cluster kind efêmero, com smoke test em `/health`.

---

## Collection das APIs

A API é documentada via **Swagger/OpenAPI**. Com a aplicação rodando:

- **Swagger UI:** `http://localhost:3000/api`
- **OpenAPI JSON:** `http://localhost:3000/api-json` (importável no Postman/Insomnia)

Exemplos de `curl` prontos por domínio em [`docs/`](docs):
[cliente](docs/curls-cliente.md) · [veículo](docs/curls-veiculo.md) ·
[ordem de serviço](docs/curls-ordem-servico.md) · [usuário](docs/curls-usuario.md).

---

## Vídeo demonstrativo

> ⚠️ **TODO (entrega):** publicar o vídeo (≤15 min) no YouTube/Vimeo demonstrando
> deploy da aplicação, execução do CI/CD, consumo das APIs e escalabilidade
> automática (HPA), e substituir este bloco pelo link.

---

## Testes

```bash
# Todos os testes (unit + integração + e2e)
npm test

# Com cobertura
npm run test:cov

# Apenas testes unitários
npx jest --testPathIgnorePatterns=integration --testPathIgnorePatterns=e2e

# Apenas testes de integração (requer Docker)
npx jest integration

# Apenas testes e2e (requer Docker)
npx jest e2e
```

Os testes de integração e e2e usam [testcontainers](https://node.testcontainers.org/) para subir uma instância PostgreSQL efêmera — não há dependência de banco externo rodando.

---

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run start:dev` | Inicia em modo desenvolvimento com hot reload |
| `npm run build` | Compila o TypeScript |
| `npm start` | Inicia a versão compilada |
| `npm test` | Executa todos os testes |
| `npm run test:cov` | Executa os testes com cobertura |
| `npm run prisma:generate` | Gera o cliente Prisma |
| `npm run prisma:migrate` | Cria e aplica migrations (dev) |
| `npm run prisma:deploy` | Aplica migrations (produção) |
| `npm run docker:up` | Sobe os containers |
| `npm run docker:down` | Para os containers |

---

## Estrutura do projeto

```
src/
├── main.ts                   # Bootstrap da aplicação
├── app.module.ts             # Módulo raiz
├── prisma/                   # PrismaService global
├── shared/                   # Base DDD + architecture.spec.ts (regra de dependência)
├── auth/                     # Bounded Context: Autenticação (Usuario, JWT)
│   ├── domain/               # Entidade, Role, Value Objects, errors
│   ├── application/          # Use Cases + ports/gateways
│   └── infrastructure/       # Controller, guards, strategies, adapters
├── usuario/                  # Bounded Context: Usuários
├── cliente/                  # Bounded Context: Atendimento (Cliente)
├── veiculo/                  # Bounded Context: Atendimento (Veículo)
├── ordem-de-servico/         # Bounded Context: Atendimento (OrdemDeServico — aggregate root)
├── servico/                  # Bounded Context: Catálogo (Serviço)
├── produto/                  # Bounded Context: Estoque (Produto)
├── notificacao/              # Bounded Context: Notificação (webhook outbound)
├── health/                   # Health/readiness checks
└── test/                     # Helpers compartilhados de teste

k8s/                          # Manifestos Kubernetes (Kustomize)
infra/terraform/              # IaC — cluster (01) + banco (02)
perf/                         # Testes de carga, estresse e escalabilidade (HPA)
```

Cada bounded context segue a estrutura DDD em camadas: **Domain → Application → Infrastructure**,
com as dependências apontando para o domínio (Clean Architecture).

---

## Documentação

- **Swagger:** `http://localhost:3000/api` (quando a app está rodando)
- **ER Diagram:** `docs/schema.dbml` (importe em [dbdiagram.io](https://dbdiagram.io))
- **User Stories:** `docs/user-stories/`
- **QA Plans:** `docs/qa-plans/`
- **Event Storming:** Miro board (ver `CLAUDE.md` para o ID)
