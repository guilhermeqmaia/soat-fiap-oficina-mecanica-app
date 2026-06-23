-- Seed test users for all roles
-- This migration runs last (99999999999999) to ensure the usuario table exists
-- Passwords (bcrypt, cost 10):
--   admin@oficina.com       → admin123
--   atendente@oficina.com   → atendente123
--   mecanico@oficina.com    → mecanico123
--   estoquista@oficina.com  → estoquista123
--   cliente@oficina.com     → cliente123

INSERT INTO "usuario" ("id", "nome", "email", "senha_hash", "role", "ativo", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'Admin Oficina',    'admin@oficina.com',      '$2b$10$pR.uDWjiwQBttJVmoJMR7OwU32.HNX8kqIA3FdDVJwP7OWXONvg6G', 'ADMIN',      true, NOW(), NOW()),
  (gen_random_uuid(), 'Atendente Teste',  'atendente@oficina.com',  '$2b$10$P1e.iAkebh/yETasKCnkBuQXTqg9zyhWoHPLU6igEU0YP68yrxSFC', 'ATENDENTE',  true, NOW(), NOW()),
  (gen_random_uuid(), 'Mecanico Teste',   'mecanico@oficina.com',   '$2b$10$nqE7CXy4ZuiOSaNsYwo/iO3pJvM1D0b7vLd829BrMHxZ4p/yXc4Ue', 'MECANICO',   true, NOW(), NOW()),
  (gen_random_uuid(), 'Estoquista Teste', 'estoquista@oficina.com', '$2b$10$qnmtiw/KdUVWT3EJteK06uaFVlMXcxLGEyR7Obkzxhcb5cpDf7ugO', 'ESTOQUISTA', true, NOW(), NOW()),
  (gen_random_uuid(), 'Cliente Teste',    'cliente@oficina.com',    '$2b$10$jQLovE7nj4y0f6N16DEAA.et/w10PiPjimxKboCwv3YtkBJ7FIciS', 'CLIENTE',    true, NOW(), NOW())
ON CONFLICT ("email") DO NOTHING;
