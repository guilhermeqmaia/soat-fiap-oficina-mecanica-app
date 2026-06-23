-- Seed de dados para testes e revisao
-- Clientes, veiculos, servicos, produtos e 1 usuario CLIENTE (dono@oficina.com / dono123)
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

-- ========== SERVICOS ==========
INSERT INTO "servico" ("id", "nome", "descricao", "preco_base", "tempo_estimado_horas", "ativo", "created_at", "updated_at")
VALUES
  ('5e111111-1111-4111-8111-111111111111', 'Troca de oleo',              'Troca de oleo e filtro',                          150.00, 1.0,  true, NOW(), NOW()),
  ('5e222222-2222-4222-8222-222222222222', 'Alinhamento',                'Alinhamento de direcao',                           80.00, 0.5,  true, NOW(), NOW()),
  ('5e333333-3333-4333-8333-333333333333', 'Balanceamento',              'Balanceamento das quatro rodas',                  100.00, 0.75, true, NOW(), NOW()),
  ('5e444444-4444-4444-8444-444444444444', 'Revisao geral',              'Inspecao completa dos sistemas do veiculo',       400.00, 3.0,  true, NOW(), NOW()),
  ('5e555555-5555-4555-8555-555555555555', 'Troca de pastilha de freio', 'Substituicao das pastilhas dianteiras',           250.00, 1.5,  true, NOW(), NOW()),
  ('5e666666-6666-4666-8666-666666666666', 'Diagnostico eletronico',     'Leitura de codigos e diagnostico via scanner',    180.00, 1.0,  true, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- ========== PRODUTOS ==========
INSERT INTO "produto" ("id", "nome", "descricao", "preco_unitario", "quantidade_estoque", "quantidade_reservada", "estoque_minimo", "ativo", "created_at", "updated_at")
VALUES
  ('9d111111-1111-4111-8111-111111111111', 'Filtro de oleo',    'Filtro de oleo universal',    45.00, 30, 0, 5,  true, NOW(), NOW()),
  ('9d222222-2222-4222-8222-222222222222', 'Oleo 5W30 (litro)', 'Oleo sintetico 5W30',          55.00, 50, 0, 10, true, NOW(), NOW()),
  ('9d333333-3333-4333-8333-333333333333', 'Pastilha de freio', 'Par dianteiro',               180.00, 20, 0, 4,  true, NOW(), NOW()),
  ('9d444444-4444-4444-8444-444444444444', 'Filtro de ar',      'Filtro de ar do motor',        60.00, 25, 0, 5,  true, NOW(), NOW()),
  ('9d555555-5555-4555-8555-555555555555', 'Vela de ignicao',   'Vela de ignicao universal',    35.00, 80, 0, 16, true, NOW(), NOW()),
  ('9d666666-6666-4666-8666-666666666666', 'Amortecedor',       'Amortecedor dianteiro',       320.00, 12, 0, 4,  true, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- ========== USUARIO CLIENTE (vinculado via email ao cliente Joao) ==========
-- senha: dono123 (bcrypt cost 10)
INSERT INTO "usuario" ("id", "nome", "email", "senha_hash", "role", "ativo", "created_at", "updated_at")
VALUES
  ('cccc9999-9999-4999-8999-999999999999', 'Joao Dono', 'dono@oficina.com', '$2b$10$4fTUA5.qgDYThjVpeGtpAe/5HGvFc3SQqM7HesENflzt3le6C/z9.', 'CLIENTE', true, NOW(), NOW())
ON CONFLICT ("email") DO NOTHING;
