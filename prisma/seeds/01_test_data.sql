-- Seed de dados para testes e revisao
-- Clientes, veiculos e 1 usuario CLIENTE (dono@oficina.com / dono123)
-- IDs fixos (UUID v4 validos, com padroes memoraveis) para facilitar os cURLs

-- ========== CLIENTES ==========
INSERT INTO "cliente" ("id", "nome", "cpf_cnpj", "email", "telefone", "created_at", "updated_at")
VALUES
  ('11111111-1111-4111-8111-111111111111', 'Joao da Silva',         '39053344705',    'dono@oficina.com',     '11999990001', NOW(), NOW()),
  ('22222222-2222-4222-8222-222222222222', 'Maria Oliveira',         '11144477735',    'maria@example.com',    '11999990002', NOW(), NOW()),
  ('33333333-3333-4333-8333-333333333333', 'Auto Pecas Brasil LTDA', '11222333000181', 'contato@autopecas.br', '11999990003', NOW(), NOW())
ON CONFLICT ("cpf_cnpj") DO NOTHING;

-- ========== VEICULOS ==========
INSERT INTO "veiculo" ("id", "placa", "marca", "modelo", "ano", "cliente_id", "ativo", "created_at", "updated_at")
VALUES
  ('aaaa1111-1111-4111-8111-111111111111', 'ABC1D23', 'Fiat',       'Uno',     2018, '11111111-1111-4111-8111-111111111111', true, NOW(), NOW()),
  ('aaaa2222-2222-4222-8222-222222222222', 'ABC2D34', 'Honda',      'Civic',   2020, '11111111-1111-4111-8111-111111111111', true, NOW(), NOW()),
  ('bbbb1111-1111-4111-8111-111111111111', 'XYZ9E87', 'Toyota',     'Corolla', 2022, '22222222-2222-4222-8222-222222222222', true, NOW(), NOW()),
  ('cccc1111-1111-4111-8111-111111111111', 'QWE5F45', 'Volkswagen', 'Saveiro', 2019, '33333333-3333-4333-8333-333333333333', true, NOW(), NOW())
ON CONFLICT ("placa") DO NOTHING;

-- ========== USUARIO CLIENTE (vinculado via email ao cliente Joao) ==========
-- senha: dono123 (bcrypt cost 10)
INSERT INTO "usuario" ("id", "nome", "email", "senha_hash", "role", "ativo", "created_at", "updated_at")
VALUES
  ('cccc9999-9999-4999-8999-999999999999', 'Joao Dono', 'dono@oficina.com', '$2b$10$4fTUA5.qgDYThjVpeGtpAe/5HGvFc3SQqM7HesENflzt3le6C/z9.', 'CLIENTE', true, NOW(), NOW())
ON CONFLICT ("email") DO NOTHING;
