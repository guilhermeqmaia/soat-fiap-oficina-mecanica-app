# QA Plan — US-04: Catalogo de Servicos

## Summary
Validates the full CRUD of services (Servico) for the auto repair shop catalog, including domain validations, pagination, filtering, duplicate name prevention, and Swagger documentation.

## Prerequisites
- Docker installed (for integration tests via testcontainers)
- Node.js 20+ installed
- Dependencies installed (`npm install`)
- Port 3000 available for manual testing

## Test Scenarios

### TS-01: Create a valid Servico
- **Type:** Automated
- **Acceptance criterion:** CRUD completo de servicos
- **Precondition:** App running or tests executable
- **Steps:**
  1. `POST /servicos` with body: `{ "nome": "Troca de oleo", "descricao": "Troca com filtro", "precoBase": 149.9, "tempoEstimadoHoras": 1.5 }`
  2. Verify response status 201
  3. Verify response contains `id`, `nome`, `descricao`, `precoBase`, `tempoEstimadoHoras`, `ativo: true`
- **Expected result:** Servico created and returned with generated UUID
- **Alternative result (error):** 400 if missing required fields

### TS-02: Reject duplicate nome on create
- **Type:** Automated
- **Acceptance criterion:** CRUD completo de servicos
- **Precondition:** A servico with nome "Troca de oleo" already exists
- **Steps:**
  1. `POST /servicos` with body containing `"nome": "Troca de oleo"`
  2. Verify response status 409 (Conflict)
- **Expected result:** ConflictException with message about duplicate name
- **Alternative result (error):** Servico created with duplicate name (failure)

### TS-03: Required fields validation
- **Type:** Automated
- **Acceptance criterion:** Campos: nome, descricao, preco base, tempo estimado em horas
- **Precondition:** None
- **Steps:**
  1. `POST /servicos` with empty body `{}`
  2. Verify response status 400
  3. Verify error messages for nome, precoBase, tempoEstimadoHoras
  4. `POST /servicos` with only `{ "nome": "Test" }` — verify 400 for missing precoBase and tempoEstimadoHoras
- **Expected result:** Validation errors for each missing required field
- **Alternative result (error):** 500 or servico created with null fields

### TS-04: Preco must be positive
- **Type:** Automated
- **Acceptance criterion:** Preco deve ser valor positivo
- **Precondition:** None
- **Steps:**
  1. `POST /servicos` with `"precoBase": 0` — verify 400
  2. `POST /servicos` with `"precoBase": -10` — verify 400
  3. `POST /servicos` with `"precoBase": 149.9` — verify 201
- **Expected result:** Only positive values accepted
- **Alternative result (error):** Zero or negative values accepted

### TS-05: Tempo estimado must be positive
- **Type:** Automated
- **Acceptance criterion:** Campos: tempo estimado em horas
- **Precondition:** None
- **Steps:**
  1. `POST /servicos` with `"tempoEstimadoHoras": 0` — verify 400
  2. `POST /servicos` with `"tempoEstimadoHoras": -1` — verify 400
  3. `POST /servicos` with `"tempoEstimadoHoras": 1.5` — verify 201
- **Expected result:** Only positive values accepted
- **Alternative result (error):** Zero or negative values accepted

### TS-06: List servicos with pagination
- **Type:** Automated
- **Acceptance criterion:** Listar servicos com paginacao e filtro por nome
- **Precondition:** 5 servicos created in the database
- **Steps:**
  1. `GET /servicos?page=1&limit=2` — verify returns 2 items, total=5
  2. `GET /servicos?page=2&limit=2` — verify returns 2 different items
  3. `GET /servicos?page=3&limit=2` — verify returns 1 item
- **Expected result:** Results paginated correctly with total count
- **Alternative result (error):** All results returned without pagination

### TS-07: Filter servicos by nome
- **Type:** Automated
- **Acceptance criterion:** Listar servicos com paginacao e filtro por nome
- **Precondition:** Servicos "Troca de oleo" and "Troca de pneu" exist
- **Steps:**
  1. `GET /servicos?nome=troca` — verify returns both (case-insensitive)
  2. `GET /servicos?nome=oleo` — verify returns only "Troca de oleo"
  3. `GET /servicos?nome=xyz` — verify returns empty list with total=0
- **Expected result:** Filter is case-insensitive partial match
- **Alternative result (error):** No filtering or case-sensitive match only

### TS-08: Find servico by ID
- **Type:** Automated
- **Acceptance criterion:** CRUD completo de servicos
- **Precondition:** A servico exists
- **Steps:**
  1. `GET /servicos/:id` with valid UUID — verify 200 with servico data
  2. `GET /servicos/:id` with non-existent UUID — verify 404
  3. `GET /servicos/invalid-id` — verify 400 (invalid UUID)
- **Expected result:** Returns servico or appropriate error
- **Alternative result (error):** 500 on not found

### TS-09: Update a servico
- **Type:** Automated
- **Acceptance criterion:** CRUD completo de servicos
- **Precondition:** A servico exists
- **Steps:**
  1. `PATCH /servicos/:id` with `{ "nome": "Novo nome", "precoBase": 200 }` — verify 200 with updated data
  2. Verify unchanged fields remain the same
  3. `PATCH /servicos/:id` with duplicate nome — verify 409
  4. `PATCH /servicos/non-existent-id` — verify 404
- **Expected result:** Partial update works, validations enforced
- **Alternative result (error):** Full replacement or missing validations

### TS-10: Delete a servico
- **Type:** Automated
- **Acceptance criterion:** CRUD completo de servicos
- **Precondition:** A servico exists
- **Steps:**
  1. `DELETE /servicos/:id` — verify 204 (No Content)
  2. `GET /servicos/:id` — verify 404 (deleted)
  3. `DELETE /servicos/non-existent-id` — verify 404
- **Expected result:** Servico removed, subsequent GET returns 404
- **Alternative result (error):** Servico not deleted or 500 on not found

### TS-11: Descricao is optional
- **Type:** Automated
- **Acceptance criterion:** Campos: nome, descricao, preco base, tempo estimado
- **Precondition:** None
- **Steps:**
  1. `POST /servicos` without `descricao` field — verify 201
  2. Verify response has `descricao: null`
- **Expected result:** Servico created without descricao
- **Alternative result (error):** 400 requiring descricao

## Edge Cases
- Creating servico with very long nome (255+ characters)
- Preco with many decimal places (e.g. 149.999999)
- tempoEstimadoHoras as very small positive value (0.01)
- Pagination with page beyond total pages (should return empty data)
- Duplicate nome check is case-insensitive ("Troca" vs "troca")
- Update with empty body (should return unchanged servico)

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| CRUD completo de servicos | TS-01, TS-02, TS-08, TS-09, TS-10 |
| Campos: nome, descricao, preco base, tempo estimado | TS-03, TS-05, TS-11 |
| Preco deve ser valor positivo | TS-04 |
| Listar servicos com paginacao e filtro por nome | TS-06, TS-07 |
| Documentacao Swagger para todos os endpoints | Swagger decorators present on all controller methods |

## Validation Checklist
- [ ] All acceptance criteria covered
- [ ] Edge cases documented
- [ ] Error flows documented
- [ ] Setup instructions are clear

## Useful Commands
```bash
# Run all tests
npm test

# Run only servico tests
npx jest servico --verbose

# Run integration tests
npx jest integration --verbose

# Run with coverage
npm run test:all:cov

# Start the app for manual testing
npm run start:dev
```
