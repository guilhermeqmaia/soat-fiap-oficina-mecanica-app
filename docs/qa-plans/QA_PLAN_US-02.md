# QA Plan — US-02: CRUD Completo de Cliente

## Summary
Validates the complete Cliente CRUD for the Atendente profile, including pagination, search by ID and by CPF/CNPJ (with or without mask), partial update via PATCH, and **soft delete** (deactivation via `ativo = false`).

## Prerequisites
- Docker installed (integration/e2e tests use testcontainers)
- Node.js 20+ installed
- Dependencies installed (`npm install`)
- Valid JWT token for a user with ATENDENTE or ADMIN role
- Port 3000 free for manual testing

## Test Scenarios

### TS-01: GET /clientes with pagination
- **Type:** Automated (integration)
- **Acceptance criterion:** GET /clientes — listar clientes com paginacao
- **Precondition:** Multiple clientes persisted
- **Steps:**
  1. `GET /clientes?page=1&limit=2`
  2. Verify 200 and `data` has 2 items
  3. Verify `total` reflects the number of **active** clientes (inactive ones are hidden by default)
- **Expected result:** Paginated response with active clientes only
- **Alternative result (error):** Inactive clientes leaking into the default list

### TS-02: GET /clientes/:id
- **Type:** Automated (unit + e2e)
- **Acceptance criterion:** GET /clientes/:id — buscar cliente por ID
- **Steps:**
  1. `GET /clientes/:id` with a valid UUID → 200 with cliente data (including `ativo`)
  2. `GET /clientes/:id` with a non-existent UUID → 404
  3. `GET /clientes/invalid` → 400 (invalid UUID)
- **Expected result:** Returns cliente (even when `ativo=false`) or correct error code

### TS-03: GET /clientes/documento/:cpfCnpj — plain digits
- **Type:** Automated (e2e)
- **Acceptance criterion:** GET /clientes/documento/:cpfCnpj
- **Steps:**
  1. Register a cliente with CPF `52998224725`
  2. `GET /clientes/documento/52998224725` → 200 with the cliente
- **Expected result:** Finds cliente by 11-digit CPF
- **Alternative result (error):** 404 or 400

### TS-04: GET /clientes/documento/:cpfCnpj — masked CPF
- **Type:** Automated (e2e)
- **Acceptance criterion:** GET /clientes/documento/:cpfCnpj
- **Steps:**
  1. Register a cliente with CPF `529.982.247-25` (service normalizes)
  2. `GET /clientes/documento/529.982.247-25` → 200
- **Expected result:** Mask is stripped via regex (`/\D/g`) before the DB lookup

### TS-05: GET /clientes/documento/:cpfCnpj — masked CNPJ
- **Type:** Automated (e2e)
- **Acceptance criterion:** GET /clientes/documento/:cpfCnpj
- **Steps:**
  1. Register a cliente with CNPJ `11.222.333/0001-81`
  2. `GET /clientes/documento/11222333000181` → 200 (plain digits)
  3. `GET /clientes/documento/11.222.333%2F0001-81` → 200 (URL-encoded `/`)
- **Expected result:** Both forms work
- **Note:** Raw `/` in the path breaks routing — callers must URL-encode it, or send digits only

### TS-06: GET /clientes/documento/:cpfCnpj — not found
- **Type:** Automated (e2e)
- **Acceptance criterion:** GET /clientes/documento/:cpfCnpj
- **Steps:**
  1. `GET /clientes/documento/52998224725` with no cliente persisted → 404
- **Expected result:** `NotFoundException`

### TS-07: GET /clientes/documento/:cpfCnpj — invalid digit count
- **Type:** Automated (unit + e2e)
- **Acceptance criterion:** Input validation
- **Steps:**
  1. `GET /clientes/documento/12345` → 400
  2. `GET /clientes/documento/---` → 400 (no digits)
- **Expected result:** `BadRequestException` before hitting the service

### TS-08: PATCH /clientes/:id — partial update
- **Type:** Automated (unit)
- **Acceptance criterion:** PUT /clientes/:id — atualizar dados do cliente
  (implementation uses PATCH, per team decision)
- **Steps:**
  1. `PATCH /clientes/:id` with `{ "nome": "Novo nome" }` → 200
  2. Verify only `nome` changed; other fields untouched
  3. `PATCH /clientes/nonexistent` → 404
- **Expected result:** Partial update works

### TS-09: DELETE /clientes/:id — soft delete
- **Type:** Automated (e2e)
- **Acceptance criterion:** DELETE /clientes/:id — remover cliente (soft delete)
- **Steps:**
  1. Create a cliente
  2. `DELETE /clientes/:id` → 204
  3. Check the database: row **still exists** with `ativo = false`
- **Expected result:** Cliente marked as inactive, not hard-deleted

### TS-10: Inactive cliente is hidden from default list
- **Type:** Automated (integration + e2e)
- **Acceptance criterion:** Soft delete behavior
- **Steps:**
  1. Create 2 clientes, soft-delete 1
  2. `GET /clientes` → returns only the active one
- **Expected result:** `total = 1`
- **Alternative result (error):** Inactive cliente leaking into the list

### TS-11: Inactive cliente is still accessible by ID
- **Type:** Automated (e2e)
- **Acceptance criterion:** Historical access
- **Steps:**
  1. Soft-delete a cliente
  2. `GET /clientes/:id` → 200 with `ativo: false`
- **Expected result:** Record available for audit/history

### TS-12: Cannot re-register same CPF after soft delete
- **Type:** Automated (e2e)
- **Acceptance criterion:** Data integrity
- **Steps:**
  1. Create a cliente, soft-delete
  2. Try `POST /clientes` with the same CPF
- **Expected result:** 409 Conflict (CPF is unique regardless of `ativo`)
- **Note:** If the business rule needs to allow re-registration, reactivate the cliente instead of creating a new one

### TS-13: Block removal of cliente with open OS
- **Type:** Manual / **pending integration**
- **Acceptance criterion:** Nao permitir remover cliente com OS em andamento
- **Status:** **Not implemented** — `OrdemDeServico` bounded context does not exist yet. A `TODO` is marked in `ClienteService.delete()`. The dedicated US for the OS module will pull this branch and wire in the check.

## Edge Cases
- Soft-deleting an already-inactive cliente (idempotent — `deactivate()` is safe to call multiple times)
- `GET /clientes/documento/:cpfCnpj` with exactly 11 digits of an invalid CPF → passes controller validation but the normalized search runs. Returns 404 because no cliente has that string.
- CNPJ containing `/` in the URL without encoding — path will not match; the test documents the workaround

## Traceability

| Acceptance criterion | Test scenarios |
|---|---|
| GET /clientes — listar com paginacao | TS-01 |
| GET /clientes/:id — buscar por ID | TS-02 |
| GET /clientes/documento/:cpfCnpj | TS-03, TS-04, TS-05, TS-06, TS-07 |
| PUT /clientes/:id — atualizar (implemented as PATCH) | TS-08 |
| DELETE /clientes/:id — soft delete | TS-09, TS-10, TS-11, TS-12 |
| Não permitir remover cliente com OS em andamento | TS-13 (pending) |
| Documentação Swagger | All controller endpoints have decorators |

## Validation Checklist
- [x] All acceptance criteria covered (except TS-13, parked for OS module)
- [x] Edge cases documented
- [x] Error flows documented
- [x] Setup instructions clear

## Useful Commands
```bash
# All tests
npm test

# Only cliente tests
npx jest cliente --verbose

# Only e2e
npx jest cliente.e2e --verbose

# Integration
npx jest prisma-cliente --verbose

# Coverage
npm run test:cov

# Run the app for manual testing
docker compose up -d
```

## Manual curl example — GET /clientes/documento/:cpfCnpj

```bash
# Plain digits
curl http://localhost:3000/clientes/documento/52998224725 \
  -H "Authorization: Bearer <token>"

# With mask
curl "http://localhost:3000/clientes/documento/529.982.247-25" \
  -H "Authorization: Bearer <token>"

# CNPJ with URL-encoded slash
curl "http://localhost:3000/clientes/documento/11.222.333%2F0001-81" \
  -H "Authorization: Bearer <token>"
```
