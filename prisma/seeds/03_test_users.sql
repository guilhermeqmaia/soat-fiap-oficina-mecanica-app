-- Seed test users for all roles
-- This migration runs last (99999999999999) to ensure the usuario table exists
-- Passwords (bcrypt, cost 10):
--   admin@oficina.com       → admin123
--   atendente@oficina.com   → atendente123
--   mecanico@oficina.com    → mecanico123
--   estoquista@oficina.com  → estoquista123
--   cliente@oficina.com     → cliente123

-- CPFs validos (digitos verificadores) — chave do login staff na Lambda (Fase 3).
-- NAO podem colidir com cpf_cnpj de `cliente` (01_test_data.sql): o mesmo CPF
-- em ambas as tabelas faria `{cpf}` (fluxo cliente, sem senha) e `{cpf,senha}`
-- (fluxo staff) devolverem identidades diferentes. O usuario de role CLIENTE
-- fica sem CPF de proposito — clientes autenticam pela tabela `cliente`.
INSERT INTO "usuario" ("id", "nome", "email", "cpf", "senha_hash", "role", "ativo", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'Admin Oficina',    'admin@oficina.com',      '52998224725', '$2b$10$pR.uDWjiwQBttJVmoJMR7OwU32.HNX8kqIA3FdDVJwP7OWXONvg6G', 'ADMIN',      true, NOW(), NOW()),
  (gen_random_uuid(), 'Atendente Teste',  'atendente@oficina.com',  '24830145773', '$2b$10$P1e.iAkebh/yETasKCnkBuQXTqg9zyhWoHPLU6igEU0YP68yrxSFC', 'ATENDENTE',  true, NOW(), NOW()),
  (gen_random_uuid(), 'Mecanico Teste',   'mecanico@oficina.com',   '16899535009', '$2b$10$nqE7CXy4ZuiOSaNsYwo/iO3pJvM1D0b7vLd829BrMHxZ4p/yXc4Ue', 'MECANICO',   true, NOW(), NOW()),
  (gen_random_uuid(), 'Estoquista Teste', 'estoquista@oficina.com', '74682488341', '$2b$10$qnmtiw/KdUVWT3EJteK06uaFVlMXcxLGEyR7Obkzxhcb5cpDf7ugO', 'ESTOQUISTA', true, NOW(), NOW()),
  (gen_random_uuid(), 'Cliente Teste',    'cliente@oficina.com',    NULL, '$2b$10$jQLovE7nj4y0f6N16DEAA.et/w10PiPjimxKboCwv3YtkBJ7FIciS', 'CLIENTE',    true, NOW(), NOW())
ON CONFLICT ("email") DO NOTHING;
