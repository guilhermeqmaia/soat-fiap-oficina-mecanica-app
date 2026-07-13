# QA Plan — US-05: Product Catalog (Parts and Supplies)

## Summary
Validates the full CRUD of products with stock control (available vs reserved), low stock alerts, pagination, name filtering, and domain validations.

## Prerequisites
- Docker installed (for integration tests via testcontainers)
- Node.js 20+ installed
- Dependencies installed (`npm install`)
- Port 3000 available for manual testing

## Test Scenarios

### TS-01: Create a valid Produto
- **Type:** Automated
- **Acceptance criterion:** Full product CRUD
- **Precondition:** App running or tests executable
- **Steps:**
  1. `POST /produtos` with body: `{ "nome": "Filtro de oleo", "descricao": "Filtro para motor", "precoUnitario": 29.9, "quantidadeEstoque": 50, "estoqueMinimo": 10 }`
  2. Verify response status 201
  3. Verify response contains `id`, `nome`, `precoUnitario`, `quantidadeEstoque`, `quantidadeReservada: 0`, `quantidadeDisponivel: 50`, `estoqueMinimo`, `ativo: true`, `alertaEstoqueBaixo: false`
- **Expected result:** Product created with stock control initialized
- **Alternative result (error):** 400 if required fields are missing

### TS-02: Reject duplicate name
- **Type:** Automated
- **Acceptance criterion:** Full product CRUD
- **Precondition:** A product named "Filtro de oleo" already exists
- **Steps:**
  1. `POST /produtos` with `"nome": "Filtro de oleo"`
  2. Verify response status 409 (Conflict)
- **Expected result:** ConflictException with duplicate name message
- **Alternative result (error):** Product created with duplicate name

### TS-03: Required fields validation
- **Type:** Automated
- **Acceptance criterion:** Fields: nome, descricao, preco unitario, quantidade em estoque, estoque minimo
- **Steps:**
  1. `POST /produtos` with empty body — verify 400
  2. Verify error messages for required fields
- **Expected result:** Validation errors for each missing required field

### TS-04: Price must be positive
- **Type:** Automated
- **Acceptance criterion:** Price and quantities must be positive values
- **Steps:**
  1. `POST /produtos` with `"precoUnitario": 0` — verify 400
  2. `POST /produtos` with `"precoUnitario": -10` — verify 400
  3. `POST /produtos` with `"precoUnitario": 29.9` — verify 201
- **Expected result:** Only positive values accepted

### TS-05: Quantities cannot be negative
- **Type:** Automated
- **Acceptance criterion:** Price and quantities must be positive values
- **Steps:**
  1. `POST /produtos` with `"quantidadeEstoque": -1` — verify 400
  2. `POST /produtos` with `"estoqueMinimo": -1` — verify 400
  3. `POST /produtos` with `"quantidadeEstoque": 0, "estoqueMinimo": 0` — verify 201
- **Expected result:** Zero allowed, negative rejected

### TS-06: Available vs reserved quantity
- **Type:** Automated
- **Acceptance criterion:** Control available vs reserved quantity
- **Steps:**
  1. Create product with quantidadeEstoque: 50
  2. Reserve 10 units (via domain)
  3. Verify quantidadeDisponivel = 40, quantidadeReservada = 10
  4. Release 5 units
  5. Verify quantidadeDisponivel = 45, quantidadeReservada = 5
- **Expected result:** Correct calculation: available = stock - reserved

### TS-07: Reject reservation above available
- **Type:** Automated
- **Acceptance criterion:** Control available vs reserved quantity
- **Steps:**
  1. Create product with quantidadeEstoque: 10
  2. Try to reserve 11 units
- **Expected result:** InsufficientStockError thrown

### TS-08: Low stock alert
- **Type:** Automated
- **Acceptance criterion:** Alert when stock reaches minimum quantity
- **Steps:**
  1. Create product with quantidadeEstoque: 10, estoqueMinimo: 10
  2. Verify `alertaEstoqueBaixo: true` in response
  3. Create product with quantidadeEstoque: 50, estoqueMinimo: 10
  4. Verify `alertaEstoqueBaixo: false`
- **Expected result:** Alert when stock <= estoqueMinimo

### TS-09: List with pagination and filter
- **Type:** Automated
- **Acceptance criterion:** GET /produtos - list with pagination and filters
- **Steps:**
  1. Create 5 products
  2. `GET /produtos?page=1&limit=2` — verify 2 items, total=5
  3. `GET /produtos?nome=filtro` — verify case-insensitive filter
- **Expected result:** Pagination and filtering work correctly

### TS-10: Add stock
- **Type:** Automated
- **Acceptance criterion:** Full product CRUD
- **Steps:**
  1. Create product with quantidadeEstoque: 50
  2. `POST /produtos/:id/estoque` with `{ "quantidade": 20 }`
  3. Verify quantidadeEstoque = 70
- **Expected result:** Stock incremented correctly

### TS-11: Update product
- **Type:** Automated
- **Acceptance criterion:** Full product CRUD
- **Steps:**
  1. `PATCH /produtos/:id` with `{ "nome": "Novo nome", "precoUnitario": 50 }`
  2. Verify updated data, unchanged fields remain the same
- **Expected result:** Partial update works

### TS-12: Delete product
- **Type:** Automated
- **Acceptance criterion:** Full product CRUD
- **Steps:**
  1. `DELETE /produtos/:id` — verify 204
  2. `GET /produtos/:id` — verify 404
- **Expected result:** Product removed

## Edge Cases
- Reserve exactly the available quantity (boundary)
- Add stock to a product with zero stock
- Product with estoqueMinimo = 0 (never alerts)
- Optional descricao (create without it)
- Duplicate name check is case-insensitive

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| Full product CRUD | TS-01, TS-02, TS-10, TS-11, TS-12 |
| Fields: nome, descricao, preco unitario, quantidade, estoque minimo | TS-03 |
| Control available vs reserved quantity | TS-06, TS-07 |
| GET /produtos - list with pagination and filters | TS-09 |
| Alert when stock reaches minimum quantity | TS-08 |
| Price and quantities must be positive values | TS-04, TS-05 |
| Swagger documentation | Swagger decorators present on all controller methods |

## Validation Checklist
- [ ] All acceptance criteria covered
- [ ] Edge cases documented
- [ ] Error flows documented
- [ ] Setup instructions are clear

## Useful Commands
```bash
# Run all tests
npm test

# Run only produto tests
npx jest produto --verbose

# Run integration tests
npx jest integration --verbose

# Run with coverage
npm run test:all:cov

# Start the app for manual testing
docker compose up -d
```
