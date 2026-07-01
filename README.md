# Oficina Mecânica — API

Back-end MVP para sistema integrado de oficina mecânica, focado em gestão de ordens de serviço, clientes, veículos e peças.

**Stack:** NestJS · TypeScript · Prisma · PostgreSQL · Docker · JWT

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

## Deploy em Kubernetes

Os manifests ficam em `k8s/` e são aplicados com Kustomize. Eles cobrem a aplicação, Service, HPA, ConfigMap, template de Secret da aplicação e Job de migrations. O cluster e o banco de dados são responsabilidade do Terraform da US-F2-06.

### 1. Gere ou publique a imagem da API

Para `kind` local:

```bash
docker build -t oficina-api:latest .
kind load docker-image oficina-api:latest --name oficina
```

Para um registry, publique a imagem e ajuste `k8s/kustomization.yaml`:

```yaml
images:
  - name: oficina-api
    newName: ghcr.io/sua-org/oficina-api
    newTag: <tag>
```

### 2. Provisione cluster e banco

Execute a infraestrutura da US-F2-06 antes dos manifests. Ela deve criar o cluster, o banco e o Secret `oficina-db` no namespace `oficina`, contendo `DATABASE_URL`.

```bash
kubectl get secret oficina-db -n oficina
```

### 3. Configure o Secret da aplicação

```bash
cp k8s/secret.yaml.example k8s/secret.yaml
# edite k8s/secret.yaml e substitua JWT_SECRET, WEBHOOK_APPROVAL_TOKEN e NOTIFICATION_WEBHOOK_SECRET
```

O arquivo real `k8s/secret.yaml` não deve ser versionado. O `DATABASE_URL` não entra nele; essa variável vem do Secret `oficina-db` criado pela infraestrutura.

### 4. Aplique migrations e suba a API

Use o script de deploy para aplicar o Secret local, recriar o Job de migrations e aplicar os manifests:

```bash
./k8s/deploy.sh
```

O Deployment usa um initContainer com permissão mínima de leitura do Job para aguardar `oficina-migrations` completar antes de iniciar a API.

Equivalente manual:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
kubectl delete job oficina-migrations -n oficina --ignore-not-found
kubectl apply -k k8s/
kubectl wait --for=condition=complete job/oficina-migrations -n oficina --timeout=300s
kubectl rollout status deployment/oficina-api -n oficina
```

O `kubectl delete job` é intencional: Jobs têm template imutável, então o Job de migrations precisa ser recriado em cada deploy para rodar com a imagem configurada em `k8s/kustomization.yaml`.

### 5. Verificações úteis

```bash
kubectl get pods,svc,hpa -n oficina
kubectl logs job/oficina-migrations -n oficina
kubectl port-forward svc/oficina-api 3000:3000 -n oficina
curl http://localhost:3000/health
```

Para acompanhar o HPA durante um teste de carga:

```bash
kubectl get hpa oficina-api -n oficina -w
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

> **Importante:** `JWT_SECRET` é obrigatória. Antes de subir os containers, copie `.env.example` para `.env` ou defina a variável no seu shell. Exemplo:
>
> ```bash
> cp .env.example .env
> # edite .env e coloque um valor forte em JWT_SECRET
> ```

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
├── auth/                     # Bounded Context: Autenticação
│   ├── domain/               # Entidade Usuario, Role, VOs, errors
│   ├── application/          # AuthService
│   └── infrastructure/       # Controller, guards, strategies, decorators
├── servico/                  # Bounded Context: Catálogo (serviços)
├── produto/                  # Bounded Context: Estoque (produtos)
└── test/                     # Helpers compartilhados de teste
```

Cada bounded context segue a estrutura DDD em camadas: **Domain → Application → Infrastructure**.

---

## Documentação

- **Swagger:** `http://localhost:3000/api` (quando a app está rodando)
- **ER Diagram:** `docs/schema.dbml` (importe em [dbdiagram.io](https://dbdiagram.io))
- **User Stories:** `docs/user-stories/`
- **QA Plans:** `docs/qa-plans/`
- **Event Storming:** Miro board (ver `CLAUDE.md` para o ID)
