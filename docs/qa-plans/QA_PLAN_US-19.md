# QA Plan — US-19: JWT Authentication

## Summary
Validates JWT authentication with role-based access control: login endpoint, protected routes, public routes, role enforcement (ADMIN, ATENDENTE, MECANICO, ESTOQUISTA, CLIENTE), token expiration, and deactivated user handling.

## Prerequisites
- Docker installed (for integration tests via testcontainers)
- Node.js 20+ installed
- Dependencies installed (`npm install`)
- Environment variables: `JWT_SECRET`, `JWT_EXPIRES_IN`
- Port 3000 available for manual testing

## Test Scenarios

### TS-01: Successful login with valid credentials
- **Type:** Automated (e2e)
- **Acceptance criterion:** POST /auth/login - authenticate and return JWT
- **Precondition:** User seeded in database
- **Steps:**
  1. `POST /auth/login` with `{ "email": "admin@oficina.com", "senha": "admin123" }`
  2. Verify response status 200
  3. Verify response contains `accessToken` and `usuario` (id, nome, email, role)
- **Expected result:** Valid JWT returned
- **Alternative result (error):** 401 on invalid credentials

### TS-02: Reject invalid password
- **Type:** Automated (e2e)
- **Acceptance criterion:** POST /auth/login authenticates user
- **Steps:**
  1. `POST /auth/login` with correct email but wrong password
  2. Verify status 401
- **Expected result:** 401 Unauthorized, no token leaked

### TS-03: Reject non-existent user
- **Type:** Automated (e2e)
- **Acceptance criterion:** POST /auth/login authenticates user
- **Steps:**
  1. `POST /auth/login` with email that doesn't exist
  2. Verify status 401 (same message as wrong password — no user enumeration)
- **Expected result:** 401 Unauthorized

### TS-04: Reject invalid email format
- **Type:** Automated (e2e)
- **Acceptance criterion:** Input validation
- **Steps:**
  1. `POST /auth/login` with `{ "email": "not-an-email", "senha": "xxxxxx" }`
  2. Verify status 400
- **Expected result:** 400 Bad Request with validation errors

### TS-05: Token with configurable expiration
- **Type:** Manual/config
- **Acceptance criterion:** JWT with configurable expiration
- **Steps:**
  1. Set `JWT_EXPIRES_IN=5s` in `.env`
  2. Login and wait >5s
  3. Call protected endpoint — verify 401
- **Expected result:** Token rejected after expiration

### TS-06: Public routes accessible without token
- **Type:** Automated (e2e)
- **Acceptance criterion:** Public endpoints: OS status tracking
- **Steps:**
  1. Call a `@Public()`-marked endpoint without token
  2. Verify status 200
- **Expected result:** Access granted

### TS-07: Authenticated routes require valid token
- **Type:** Automated (e2e)
- **Acceptance criterion:** Guard to protect administrative routes
- **Steps:**
  1. Call a protected endpoint without token — verify 401
  2. Call with invalid/malformed token — verify 401
  3. Call with valid token — verify 200
- **Expected result:** Only valid tokens grant access

### TS-08: ADMIN-only route enforces role
- **Type:** Automated (e2e)
- **Acceptance criterion:** Roles: ADMIN, ATENDENTE, MECANICO, CLIENTE, ESTOQUISTA
- **Steps:**
  1. Call ADMIN-only endpoint with ADMIN token — verify 200
  2. Call with ATENDENTE/MECANICO/ESTOQUISTA/CLIENTE token — verify 403
- **Expected result:** Only ADMIN can access

### TS-09: Multi-role routes (ATENDENTE or ADMIN)
- **Type:** Automated (e2e)
- **Acceptance criterion:** Role-based access control
- **Steps:**
  1. Call endpoint with ADMIN token — verify 200
  2. Call with ATENDENTE token — verify 200
  3. Call with MECANICO/ESTOQUISTA/CLIENTE — verify 403
- **Expected result:** Any of the allowed roles grants access

### TS-10: Staff routes (all except CLIENTE)
- **Type:** Automated (e2e)
- **Acceptance criterion:** Role-based access control
- **Steps:**
  1. Call endpoint with ADMIN, ATENDENTE, MECANICO, ESTOQUISTA tokens — verify 200 each
  2. Call with CLIENTE token — verify 403
- **Expected result:** Staff access allowed, CLIENTE denied

### TS-11: Deactivated user cannot use existing token
- **Type:** Automated (e2e)
- **Acceptance criterion:** Security requirement
- **Steps:**
  1. Login as user — get token
  2. Deactivate user in database (`ativo = false`)
  3. Use token to call `/auth/me` — verify 401
- **Expected result:** Token rejected even if unexpired

### TS-12: GET /auth/me returns current user info
- **Type:** Automated (e2e)
- **Acceptance criterion:** Authenticated user context
- **Steps:**
  1. Call `/auth/me` with valid token
  2. Verify response contains `id`, `nome`, `email`, `role`
- **Expected result:** Returns authenticated user profile

### TS-13: Password hashing with bcrypt
- **Type:** Automated (unit)
- **Acceptance criterion:** Security
- **Steps:**
  1. Seed user with password "admin123"
  2. Verify database stores bcrypt hash (starts with `$2b$`)
  3. Login succeeds with original password
- **Expected result:** Plaintext password never stored

### TS-14: Case-insensitive email on login
- **Type:** Automated (integration)
- **Steps:**
  1. Seed user with `admin@oficina.com`
  2. Login with `ADMIN@OFICINA.COM`
  3. Verify success
- **Expected result:** Email comparison is case-insensitive

## Edge Cases
- Empty body on login (validation error)
- Expired token (401)
- Token with tampered signature (401)
- User deactivated after token issued (401 on next request)
- Route with no `@Roles()` but guarded by JwtAuthGuard (any authenticated user allowed)
- Reflector metadata missing (RolesGuard allows access when no roles specified)

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| POST /auth/login - authenticate and return JWT | TS-01, TS-02, TS-03, TS-04 |
| JWT with configurable expiration | TS-05 |
| Guard to protect administrative routes | TS-07, TS-08, TS-09, TS-10, TS-11 |
| Roles: ADMIN, ATENDENTE, MECANICO, CLIENTE, ESTOQUISTA | TS-08, TS-09, TS-10 |
| Public endpoints: OS status tracking | TS-06 |
| Unit tests for guard and JWT strategy | Unit tests in `jwt.strategy.spec.ts`, `jwt-auth.guard.spec.ts`, `roles.guard.spec.ts` |

## Validation Checklist
- [ ] All acceptance criteria covered
- [ ] Edge cases documented
- [ ] Error flows documented
- [ ] Setup instructions are clear

## Useful Commands
```bash
# Run all tests
npm test

# Run only auth tests
npx jest auth --verbose

# Run e2e tests
npx jest e2e --verbose

# Run integration tests
npx jest integration --verbose

# Run with coverage
npm run test:all:cov

# Seed database with test users
npm run seed

# Start the app for manual testing
docker compose up -d
```

## Test Users (seeded)

| Role       | Email                     | Password       |
|------------|---------------------------|----------------|
| ADMIN      | admin@oficina.com         | admin123       |
| ATENDENTE  | atendente@oficina.com     | atendente123   |
| MECANICO   | mecanico@oficina.com      | mecanico123    |
| ESTOQUISTA | estoquista@oficina.com    | estoquista123  |
| CLIENTE    | cliente@oficina.com       | cliente123     |
