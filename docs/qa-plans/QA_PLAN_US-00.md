# QA Plan — US-00: Setup Prisma + PostgreSQL

## Summary
Validates that Prisma ORM is correctly configured with PostgreSQL, the PrismaService is globally available in NestJS, Docker infrastructure works, and migrations run automatically.

## Prerequisites
- Docker and Docker Compose installed
- Node.js 20+ installed
- Project dependencies installed (`npm install`)
- No other service running on ports `5432` and `3000`

## Test Scenarios

### TS-01: Prisma client generation
- **Type:** Automated
- **Acceptance criterion:** Install and configure Prisma in the NestJS project
- **Precondition:** Dependencies installed
- **Steps:**
  1. Run `npx prisma generate`
  2. Check that `src/generated/prisma/` directory is created with client files
- **Expected result:** Command succeeds and generated files exist
- **Alternative result (error):** Missing `prisma` dependency or invalid `schema.prisma`

### TS-02: PostgreSQL datasource configuration
- **Type:** Manual
- **Acceptance criterion:** PostgreSQL as database; schema.prisma with PostgreSQL datasource
- **Precondition:** None
- **Steps:**
  1. Open `prisma/schema.prisma`
  2. Verify `datasource db` block has `provider = "postgresql"`
  3. Open `prisma.config.ts`
  4. Verify `datasource.url` reads from `process.env.DATABASE_URL`
- **Expected result:** PostgreSQL is configured as the datasource provider
- **Alternative result (error):** Wrong provider or missing config

### TS-03: PrismaService as global provider
- **Type:** Automated
- **Acceptance criterion:** PrismaService as global provider; PrismaModule exportable
- **Precondition:** Dependencies installed
- **Steps:**
  1. Run `npm test`
  2. Verify `prisma.module.spec.ts` tests pass (module compiles, service is provided and exported)
  3. Verify `app.module.spec.ts` tests pass (PrismaService available from AppModule)
- **Expected result:** All module wiring tests pass
- **Alternative result (error):** PrismaService not found or not injectable in other modules

### TS-04: Docker Compose — PostgreSQL service
- **Type:** Manual
- **Acceptance criterion:** docker-compose.yml with PostgreSQL service (postgres:16-alpine)
- **Precondition:** Docker running
- **Steps:**
  1. Run `docker compose up -d postgres`
  2. Run `docker compose ps` and verify the `postgres` service is running
  3. Run `docker compose exec postgres psql -U postgres -d oficina_mecanica -c '\l'`
  4. Verify the `oficina_mecanica` database exists
- **Expected result:** PostgreSQL 16-alpine container is running with the correct database
- **Alternative result (error):** Container fails to start or database not created

### TS-05: DATABASE_URL via .env
- **Type:** Manual
- **Acceptance criterion:** DATABASE_URL configurable via .env
- **Precondition:** None
- **Steps:**
  1. Verify `.env` file exists with `DATABASE_URL` variable
  2. Verify `.env.example` file exists with a sample `DATABASE_URL`
  3. Verify `.gitignore` includes `.env`
  4. Verify `app.module.ts` imports `ConfigModule.forRoot({ isGlobal: true })`
- **Expected result:** Environment variable is configurable and `.env` is not tracked by git
- **Alternative result (error):** Missing `.env.example` or `.env` committed to git

### TS-06: Automatic migration on container startup
- **Type:** Manual
- **Acceptance criterion:** Migration script in entrypoint (npx prisma migrate deploy)
- **Precondition:** Docker running, migrations exist
- **Steps:**
  1. Create a migration: `npx prisma migrate dev --name init`
  2. Run `docker compose up --build`
  3. Check app container logs: `docker compose logs app`
  4. Verify logs contain `prisma migrate deploy` output
- **Expected result:** Migrations are applied automatically before the app starts
- **Alternative result (error):** App starts without running migrations or migration fails

### TS-07: PrismaService lifecycle hooks
- **Type:** Automated
- **Acceptance criterion:** PrismaService correctly manages connection lifecycle
- **Precondition:** Dependencies installed
- **Steps:**
  1. Run `npm test`
  2. Verify `prisma.service.spec.ts` tests pass
  3. Confirm `$connect` is called on `onModuleInit`
  4. Confirm `$disconnect` is called on `onModuleDestroy`
- **Expected result:** All lifecycle tests pass
- **Alternative result (error):** Connection not established or not properly closed

### TS-08: StatusOrdemDeServico enum in schema
- **Type:** Manual
- **Acceptance criterion:** Schema contains the OS status enum
- **Precondition:** None
- **Steps:**
  1. Open `prisma/schema.prisma`
  2. Verify `enum StatusOrdemDeServico` exists with values: RECEBIDA, EM_DIAGNOSTICO, AGUARDANDO_APROVACAO, EM_EXECUCAO, FINALIZADA, ENTREGUE, CANCELADA
- **Expected result:** All 7 enum values are present
- **Alternative result (error):** Missing or misspelled values

## Edge Cases
- Starting `docker compose up` without `.env` file (should use docker-compose environment variables)
- Running `npx prisma migrate deploy` with no migrations directory (should succeed with no-op)
- Running tests without a running database (unit tests should pass since they mock PrismaService)
- Invalid `DATABASE_URL` format (PrismaService constructor should fail on app startup)

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| Install and configure Prisma | TS-01 |
| PostgreSQL as database | TS-02 |
| Initial schema.prisma with PostgreSQL datasource | TS-02, TS-08 |
| PrismaService as global provider | TS-03 |
| Exportable PrismaModule | TS-03 |
| docker-compose.yml with PostgreSQL (postgres:16-alpine) | TS-04 |
| DATABASE_URL via .env | TS-05 |
| Automatic migration on entrypoint | TS-06 |
| .env.example with sample DATABASE_URL | TS-05 |

## Validation Checklist
- [ ] All acceptance criteria covered
- [ ] Edge cases documented
- [ ] Error flows documented
- [ ] Setup instructions are clear

## Useful Commands
```bash
# Run all unit tests
npm test

# Run tests with coverage
npm run test:all:cov

# Start only PostgreSQL
docker compose up -d postgres

# Run migration manually
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Full stack with Docker
docker compose up --build
```
