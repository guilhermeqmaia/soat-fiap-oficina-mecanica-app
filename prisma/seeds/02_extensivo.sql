-- Seed extensivo: muitos clientes, veiculos e OSs em todos os status
-- Senha de todos usuarios CLIENTE adicionados aqui: "cliente123" (hash bcrypt reaproveitado)

-- ========== ALINHA email do cliente Joao com user CLIENTE seed ==========
UPDATE "cliente" SET "email" = 'cliente@oficina.com'
  WHERE "id" = '11111111-1111-4111-8111-111111111111';

-- ========== CLIENTES ADICIONAIS (12 novos) ==========
INSERT INTO "cliente" ("id", "nome", "cpf_cnpj", "email", "telefone", "created_at", "updated_at")
VALUES
  ('c1111111-1111-4111-8111-000000000001', 'Carlos Mendes',          '10433218100',    'carlos@email.com',     '11991110001', NOW(), NOW()),
  ('c1111111-1111-4111-8111-000000000002', 'Ana Paula Souza',        '96001338914',    'ana.souza@email.com',  '11991110002', NOW(), NOW()),
  ('c1111111-1111-4111-8111-000000000003', 'Pedro Henrique Lima',    '08386379499',    'pedro@email.com',      '11991110003', NOW(), NOW()),
  ('c1111111-1111-4111-8111-000000000004', 'Beatriz Almeida',        '02654235114',    'bia@email.com',        '11991110004', NOW(), NOW()),
  ('c1111111-1111-4111-8111-000000000005', 'Rafael Costa',           '16155940789',    'rafa@email.com',       '11991110005', NOW(), NOW()),
  ('c1111111-1111-4111-8111-000000000006', 'Juliana Ribeiro',        '81618495950',    'ju@email.com',         '11991110006', NOW(), NOW()),
  ('c1111111-1111-4111-8111-000000000007', 'Marcos Pereira',         '31034131656',    'marcos@email.com',     '11991110007', NOW(), NOW()),
  ('c1111111-1111-4111-8111-000000000008', 'Fernanda Castro',        '47525534144',    'fernanda@email.com',   '11991110008', NOW(), NOW()),
  ('c1111111-1111-4111-8111-000000000009', 'Lucas Martins',          '92832764851',    'lucas@email.com',      '11991110009', NOW(), NOW()),
  ('c1111111-1111-4111-8111-000000000010', 'Logistica Veloz LTDA',   '39537672000176', 'frota@veloz.com.br',   '1133220010',  NOW(), NOW()),
  ('c1111111-1111-4111-8111-000000000011', 'Transportes Sigma S/A',  '42388496000162', 'frota@sigma.com.br',   '1133220011',  NOW(), NOW()),
  ('c1111111-1111-4111-8111-000000000012', 'Patricia Gomes',         '35030564160',    'patricia@email.com',   '11991110012', NOW(), NOW())
ON CONFLICT ("cpf_cnpj") DO NOTHING;

-- ========== VEICULOS ADICIONAIS (25 novos, distribuidos pelos clientes) ==========
INSERT INTO "veiculo" ("id", "placa", "marca", "modelo", "ano", "cliente_id", "ativo", "created_at", "updated_at")
VALUES
  -- Carlos Mendes
  ('d1111111-1111-4111-8111-000000000001', 'PRA1B23', 'Chevrolet',  'Onix',         2021, 'c1111111-1111-4111-8111-000000000001', true, NOW(), NOW()),
  ('d1111111-1111-4111-8111-000000000002', 'PRA1B24', 'Hyundai',    'HB20',         2019, 'c1111111-1111-4111-8111-000000000001', true, NOW(), NOW()),
  -- Ana Paula
  ('d1111111-1111-4111-8111-000000000003', 'BRA2C45', 'Renault',    'Kwid',         2022, 'c1111111-1111-4111-8111-000000000002', true, NOW(), NOW()),
  -- Pedro Henrique
  ('d1111111-1111-4111-8111-000000000004', 'CRA3D67', 'Jeep',       'Renegade',     2023, 'c1111111-1111-4111-8111-000000000003', true, NOW(), NOW()),
  ('d1111111-1111-4111-8111-000000000005', 'CRA3D68', 'Ford',       'Ka',           2017, 'c1111111-1111-4111-8111-000000000003', true, NOW(), NOW()),
  -- Beatriz Almeida
  ('d1111111-1111-4111-8111-000000000006', 'DRA4E89', 'Honda',      'Fit',          2018, 'c1111111-1111-4111-8111-000000000004', true, NOW(), NOW()),
  -- Rafael Costa
  ('d1111111-1111-4111-8111-000000000007', 'ERA5F01', 'Volkswagen', 'Gol',          2016, 'c1111111-1111-4111-8111-000000000005', true, NOW(), NOW()),
  ('d1111111-1111-4111-8111-000000000008', 'ERA5F02', 'Volkswagen', 'Polo',         2022, 'c1111111-1111-4111-8111-000000000005', true, NOW(), NOW()),
  ('d1111111-1111-4111-8111-000000000009', 'ERA5F03', 'Toyota',     'Hilux',        2021, 'c1111111-1111-4111-8111-000000000005', true, NOW(), NOW()),
  -- Juliana Ribeiro
  ('d1111111-1111-4111-8111-000000000010', 'FRA6G12', 'Nissan',     'Versa',        2020, 'c1111111-1111-4111-8111-000000000006', true, NOW(), NOW()),
  -- Marcos Pereira
  ('d1111111-1111-4111-8111-000000000011', 'GRA7H34', 'Fiat',       'Argo',         2021, 'c1111111-1111-4111-8111-000000000007', true, NOW(), NOW()),
  ('d1111111-1111-4111-8111-000000000012', 'GRA7H35', 'Fiat',       'Strada',       2019, 'c1111111-1111-4111-8111-000000000007', true, NOW(), NOW()),
  -- Fernanda Castro
  ('d1111111-1111-4111-8111-000000000013', 'HRA8I56', 'Peugeot',    '208',          2020, 'c1111111-1111-4111-8111-000000000008', true, NOW(), NOW()),
  -- Lucas Martins
  ('d1111111-1111-4111-8111-000000000014', 'IRA9J78', 'Citroen',    'C3',           2018, 'c1111111-1111-4111-8111-000000000009', true, NOW(), NOW()),
  ('d1111111-1111-4111-8111-000000000015', 'IRA9J79', 'Mitsubishi', 'L200',         2020, 'c1111111-1111-4111-8111-000000000009', true, NOW(), NOW()),
  -- Logistica Veloz (frota)
  ('d1111111-1111-4111-8111-000000000016', 'JRB0K90', 'Mercedes',   'Sprinter',     2019, 'c1111111-1111-4111-8111-000000000010', true, NOW(), NOW()),
  ('d1111111-1111-4111-8111-000000000017', 'JRB0K91', 'Iveco',      'Daily',        2020, 'c1111111-1111-4111-8111-000000000010', true, NOW(), NOW()),
  ('d1111111-1111-4111-8111-000000000018', 'JRB0K92', 'Renault',    'Master',       2021, 'c1111111-1111-4111-8111-000000000010', true, NOW(), NOW()),
  ('d1111111-1111-4111-8111-000000000019', 'JRB0K93', 'Fiat',       'Ducato',       2018, 'c1111111-1111-4111-8111-000000000010', true, NOW(), NOW()),
  -- Transportes Sigma (frota)
  ('d1111111-1111-4111-8111-000000000020', 'KRC1L11', 'Volvo',      'FH',           2022, 'c1111111-1111-4111-8111-000000000011', true, NOW(), NOW()),
  ('d1111111-1111-4111-8111-000000000021', 'KRC1L12', 'Scania',     'R450',         2021, 'c1111111-1111-4111-8111-000000000011', true, NOW(), NOW()),
  ('d1111111-1111-4111-8111-000000000022', 'KRC1L13', 'Mercedes',   'Atego',        2019, 'c1111111-1111-4111-8111-000000000011', true, NOW(), NOW()),
  -- Patricia Gomes
  ('d1111111-1111-4111-8111-000000000023', 'LRD2M22', 'Hyundai',    'Creta',        2023, 'c1111111-1111-4111-8111-000000000012', true, NOW(), NOW()),
  ('d1111111-1111-4111-8111-000000000024', 'LRD2M23', 'Honda',      'CRV',          2020, 'c1111111-1111-4111-8111-000000000012', true, NOW(), NOW()),
  -- Auto Pecas Brasil (cliente seed existente, frota)
  ('d1111111-1111-4111-8111-000000000025', 'MRE3N33', 'Volkswagen', 'Delivery',     2022, '33333333-3333-4333-8333-333333333333', true, NOW(), NOW())
ON CONFLICT ("placa") DO NOTHING;

-- ========== USUARIOS CLIENTE (5 adicionais, vinculados por email aos clientes acima) ==========
-- Senha de todos: "cliente123" (mesmo hash do user cliente@oficina.com seed)
INSERT INTO "usuario" ("id", "nome", "email", "senha_hash", "role", "ativo", "created_at", "updated_at")
VALUES
  ('a0000001-1111-4111-8111-000000000001', 'Carlos Mendes',     'carlos@email.com',     '$2b$10$jQLovE7nj4y0f6N16DEAA.et/w10PiPjimxKboCwv3YtkBJ7FIciS', 'CLIENTE', true, NOW(), NOW()),
  ('a0000001-1111-4111-8111-000000000002', 'Ana Paula Souza',   'ana.souza@email.com',  '$2b$10$jQLovE7nj4y0f6N16DEAA.et/w10PiPjimxKboCwv3YtkBJ7FIciS', 'CLIENTE', true, NOW(), NOW()),
  ('a0000001-1111-4111-8111-000000000003', 'Beatriz Almeida',   'bia@email.com',        '$2b$10$jQLovE7nj4y0f6N16DEAA.et/w10PiPjimxKboCwv3YtkBJ7FIciS', 'CLIENTE', true, NOW(), NOW()),
  ('a0000001-1111-4111-8111-000000000004', 'Rafael Costa',      'rafa@email.com',       '$2b$10$jQLovE7nj4y0f6N16DEAA.et/w10PiPjimxKboCwv3YtkBJ7FIciS', 'CLIENTE', true, NOW(), NOW()),
  ('a0000001-1111-4111-8111-000000000005', 'Logistica Veloz',   'frota@veloz.com.br',   '$2b$10$jQLovE7nj4y0f6N16DEAA.et/w10PiPjimxKboCwv3YtkBJ7FIciS', 'CLIENTE', true, NOW(), NOW())
ON CONFLICT ("email") DO NOTHING;

-- ========== ORDENS DE SERVICO (28 OSs em todos os status) ==========
-- Helper: usuarioId do mecanico (subquery quando precisar)
DO $$
DECLARE
  v_mecanico_id UUID := (SELECT id FROM "usuario" WHERE email = 'mecanico@oficina.com' LIMIT 1);
BEGIN

INSERT INTO "ordem_de_servico" ("id", "numero", "cliente_id", "veiculo_id", "usuario_id", "descricao_inicial", "diagnostico", "status", "created_at", "updated_at")
VALUES
  -- ===== RECEBIDA (5) — sem mecanico atribuido =====
  ('11111111-aaaa-4aaa-8aaa-000000000001', 'OS-2026-2700000-0001', 'c1111111-1111-4111-8111-000000000001', 'd1111111-1111-4111-8111-000000000001', NULL,
   'Cliente reporta luz da injecao acesa no painel', NULL, 'RECEBIDA', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
  ('11111111-aaaa-4aaa-8aaa-000000000002', 'OS-2026-2700000-0002', 'c1111111-1111-4111-8111-000000000002', 'd1111111-1111-4111-8111-000000000003', NULL,
   'Barulho ao virar volante para a esquerda', NULL, 'RECEBIDA', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),
  ('11111111-aaaa-4aaa-8aaa-000000000003', 'OS-2026-2700000-0003', 'c1111111-1111-4111-8111-000000000003', 'd1111111-1111-4111-8111-000000000004', NULL,
   'Revisao programada de 10.000km', NULL, 'RECEBIDA', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),
  ('11111111-aaaa-4aaa-8aaa-000000000004', 'OS-2026-2700000-0004', 'c1111111-1111-4111-8111-000000000010', 'd1111111-1111-4111-8111-000000000016', NULL,
   'Vazamento de oleo aparente na traseira', NULL, 'RECEBIDA', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),
  ('11111111-aaaa-4aaa-8aaa-000000000005', 'OS-2026-2700000-0005', 'c1111111-1111-4111-8111-000000000007', 'd1111111-1111-4111-8111-000000000011', NULL,
   'Ar-condicionado nao gela', NULL, 'RECEBIDA', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'),

  -- ===== EM_DIAGNOSTICO (4) — mecanico atribuido, sem diagnostico final =====
  ('11111111-aaaa-4aaa-8aaa-000000000006', 'OS-2026-2700000-0006', 'c1111111-1111-4111-8111-000000000004', 'd1111111-1111-4111-8111-000000000006', v_mecanico_id,
   'Vibracao acentuada acima de 80km/h', NULL, 'EM_DIAGNOSTICO', NOW() - INTERVAL '1 day', NOW() - INTERVAL '20 hours'),
  ('11111111-aaaa-4aaa-8aaa-000000000007', 'OS-2026-2700000-0007', 'c1111111-1111-4111-8111-000000000005', 'd1111111-1111-4111-8111-000000000007', v_mecanico_id,
   'Marcha trepida ao engatar primeira', NULL, 'EM_DIAGNOSTICO', NOW() - INTERVAL '1 day', NOW() - INTERVAL '18 hours'),
  ('11111111-aaaa-4aaa-8aaa-000000000008', 'OS-2026-2700000-0008', 'c1111111-1111-4111-8111-000000000011', 'd1111111-1111-4111-8111-000000000020', v_mecanico_id,
   'Caminhao engasga em rotacoes baixas', NULL, 'EM_DIAGNOSTICO', NOW() - INTERVAL '8 hours', NOW() - INTERVAL '7 hours'),
  ('11111111-aaaa-4aaa-8aaa-000000000009', 'OS-2026-2700000-0009', 'c1111111-1111-4111-8111-000000000008', 'd1111111-1111-4111-8111-000000000013', v_mecanico_id,
   'Veiculo nao da partida pela manha', NULL, 'EM_DIAGNOSTICO', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours'),

  -- ===== AGUARDANDO_APROVACAO (4) — diagnostico concluido, aguarda decisao do cliente =====
  ('11111111-aaaa-4aaa-8aaa-000000000010', 'OS-2026-2700000-0010', '11111111-1111-4111-8111-111111111111', 'aaaa1111-1111-4111-8111-111111111111', v_mecanico_id,
   'Cliente relata que carro nao freia bem em descida',
   'Pastilhas de freio dianteiras desgastadas (espessura 2mm). Discos com sulcos. Recomendamos troca completa.',
   'AGUARDANDO_APROVACAO', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),
  ('11111111-aaaa-4aaa-8aaa-000000000011', 'OS-2026-2700000-0011', 'c1111111-1111-4111-8111-000000000009', 'd1111111-1111-4111-8111-000000000014', v_mecanico_id,
   'Embreagem patinando',
   'Disco de embreagem totalmente desgastado. Necessario substituir kit completo.',
   'AGUARDANDO_APROVACAO', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),
  ('11111111-aaaa-4aaa-8aaa-000000000012', 'OS-2026-2700000-0012', 'c1111111-1111-4111-8111-000000000012', 'd1111111-1111-4111-8111-000000000023', v_mecanico_id,
   'Revisao 20.000km',
   'Revisao concluida. Recomenda-se troca de oleo, filtros e velas. Demais itens em bom estado.',
   'AGUARDANDO_APROVACAO', NOW() - INTERVAL '1 day', NOW() - INTERVAL '6 hours'),
  ('11111111-aaaa-4aaa-8aaa-000000000013', 'OS-2026-2700000-0013', 'c1111111-1111-4111-8111-000000000010', 'd1111111-1111-4111-8111-000000000017', v_mecanico_id,
   'Veiculo perdendo potencia em subidas',
   'Bicos injetores entupidos. Necessario diagnostico aprofundado e limpeza.',
   'AGUARDANDO_APROVACAO', NOW() - INTERVAL '2 days', NOW() - INTERVAL '12 hours'),

  -- ===== EM_EXECUCAO (3) — orcamento aprovado, em servico =====
  ('11111111-aaaa-4aaa-8aaa-000000000014', 'OS-2026-2700000-0014', '22222222-2222-4222-8222-222222222222', 'bbbb1111-1111-4111-8111-111111111111', v_mecanico_id,
   'Troca de oleo programada',
   'Troca de oleo, filtros e revisao de fluidos.',
   'EM_EXECUCAO', NOW() - INTERVAL '5 days', NOW() - INTERVAL '6 hours'),
  ('11111111-aaaa-4aaa-8aaa-000000000015', 'OS-2026-2700000-0015', 'c1111111-1111-4111-8111-000000000005', 'd1111111-1111-4111-8111-000000000008', v_mecanico_id,
   'Manutencao preventiva',
   'Troca de oleo, filtros, velas e correia.',
   'EM_EXECUCAO', NOW() - INTERVAL '4 days', NOW() - INTERVAL '12 hours'),
  ('11111111-aaaa-4aaa-8aaa-000000000016', 'OS-2026-2700000-0016', 'c1111111-1111-4111-8111-000000000011', 'd1111111-1111-4111-8111-000000000022', v_mecanico_id,
   'Caminhao com vazamento de oleo',
   'Junta de cabecote comprometida. Substituicao necessaria.',
   'EM_EXECUCAO', NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day'),

  -- ===== FINALIZADA (3) — execucao concluida, aguardando retirada =====
  ('11111111-aaaa-4aaa-8aaa-000000000017', 'OS-2026-2700000-0017', 'c1111111-1111-4111-8111-000000000001', 'd1111111-1111-4111-8111-000000000002', v_mecanico_id,
   'Troca de pastilhas',
   'Pastilhas trocadas e disco retificado. Veiculo pronto.',
   'FINALIZADA', NOW() - INTERVAL '7 days', NOW() - INTERVAL '8 hours'),
  ('11111111-aaaa-4aaa-8aaa-000000000018', 'OS-2026-2700000-0018', 'c1111111-1111-4111-8111-000000000004', 'd1111111-1111-4111-8111-000000000006', v_mecanico_id,
   'Recarga de ar-condicionado',
   'Recarga concluida e teste de pressao OK.',
   'FINALIZADA', NOW() - INTERVAL '8 days', NOW() - INTERVAL '4 hours'),
  ('11111111-aaaa-4aaa-8aaa-000000000019', 'OS-2026-2700000-0019', 'c1111111-1111-4111-8111-000000000010', 'd1111111-1111-4111-8111-000000000018', v_mecanico_id,
   'Substituicao de bateria',
   'Bateria nova instalada e sistema testado.',
   'FINALIZADA', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 hours'),

  -- ===== ENTREGUE (4) — veiculo ja retirado pelo cliente =====
  ('11111111-aaaa-4aaa-8aaa-000000000020', 'OS-2026-2700000-0020', 'c1111111-1111-4111-8111-000000000007', 'd1111111-1111-4111-8111-000000000012', v_mecanico_id,
   'Alinhamento e balanceamento',
   'Servico realizado com sucesso.',
   'ENTREGUE', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),
  ('11111111-aaaa-4aaa-8aaa-000000000021', 'OS-2026-2700000-0021', 'c1111111-1111-4111-8111-000000000005', 'd1111111-1111-4111-8111-000000000009', v_mecanico_id,
   'Revisao 30.000km',
   'Revisao completa concluida. Recomenda-se proxima revisao em 10.000km.',
   'ENTREGUE', NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days'),
  ('11111111-aaaa-4aaa-8aaa-000000000022', 'OS-2026-2700000-0022', 'c1111111-1111-4111-8111-000000000006', 'd1111111-1111-4111-8111-000000000010', v_mecanico_id,
   'Troca de pneus',
   'Trocados 4 pneus 195/65 R15 e balanceamento.',
   'ENTREGUE', NOW() - INTERVAL '25 days', NOW() - INTERVAL '24 days'),
  ('11111111-aaaa-4aaa-8aaa-000000000023', 'OS-2026-2700000-0023', 'c1111111-1111-4111-8111-000000000003', 'd1111111-1111-4111-8111-000000000005', v_mecanico_id,
   'Polimento e cristalizacao',
   'Servico estetico concluido.',
   'ENTREGUE', NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days'),

  -- ===== CANCELADA (3) — orcamento rejeitado pelo cliente =====
  ('11111111-aaaa-4aaa-8aaa-000000000024', 'OS-2026-2700000-0024', 'c1111111-1111-4111-8111-000000000002', 'd1111111-1111-4111-8111-000000000003', v_mecanico_id,
   'Veiculo com cheiro de queimado',
   'Embreagem queimada. Substituicao necessaria, mas valor ficou acima do esperado.',
   'CANCELADA', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days'),
  ('11111111-aaaa-4aaa-8aaa-000000000025', 'OS-2026-2700000-0025', 'c1111111-1111-4111-8111-000000000008', 'd1111111-1111-4111-8111-000000000013', v_mecanico_id,
   'Diagnostico do motor',
   'Motor com problemas serios. Cliente optou por levar a outro lugar.',
   'CANCELADA', NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days'),
  ('11111111-aaaa-4aaa-8aaa-000000000026', 'OS-2026-2700000-0026', '33333333-3333-4333-8333-333333333333', 'cccc1111-1111-4111-8111-111111111111', v_mecanico_id,
   'Vazamento no radiador',
   'Radiador comprometido. Cliente decidiu trocar o veiculo.',
   'CANCELADA', NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days'),

  -- ===== Mais 2 ENTREGUE (historico recente do cliente "Joao") =====
  ('11111111-aaaa-4aaa-8aaa-000000000027', 'OS-2026-2700000-0027', '11111111-1111-4111-8111-111111111111', 'aaaa1111-1111-4111-8111-111111111111', v_mecanico_id,
   'Troca de oleo de rotina',
   'Servico padrao de revisao.',
   'ENTREGUE', NOW() - INTERVAL '90 days', NOW() - INTERVAL '88 days'),
  ('11111111-aaaa-4aaa-8aaa-000000000028', 'OS-2026-2700000-0028', '11111111-1111-4111-8111-111111111111', 'aaaa2222-2222-4222-8222-222222222222', v_mecanico_id,
   'Troca de bateria',
   'Bateria substituida com sucesso.',
   'ENTREGUE', NOW() - INTERVAL '60 days', NOW() - INTERVAL '59 days')
ON CONFLICT ("id") DO NOTHING;

END $$;

-- ========== ITENS DE SERVICO (snapshot: nome e preco congelados no diagnostico — catalogo vive no Execucao Service) ==========
INSERT INTO "item_ordem_de_servico_servico" ("id", "ordem_de_servico_id", "servico_id", "nome", "quantidade", "preco_unitario", "created_at")
VALUES
  -- OS-0006 (EM_DIAGNOSTICO)
  ('aaaaaaaa-1111-4111-8111-000000000001', '11111111-aaaa-4aaa-8aaa-000000000006', '5e333333-3333-4333-8333-333333333333', 'Balanceamento', 1, 100.00, NOW()),
  ('aaaaaaaa-1111-4111-8111-000000000002', '11111111-aaaa-4aaa-8aaa-000000000006', '5e222222-2222-4222-8222-222222222222', 'Alinhamento', 1,  80.00, NOW()),

  -- OS-0010 (AGUARDANDO_APROVACAO - Joao freios)
  ('aaaaaaaa-1111-4111-8111-000000000010', '11111111-aaaa-4aaa-8aaa-000000000010', '5e555555-5555-4555-8555-555555555555', 'Troca de pastilha de freio', 1, 250.00, NOW()),
  ('aaaaaaaa-1111-4111-8111-000000000011', '11111111-aaaa-4aaa-8aaa-000000000010', '5e666666-6666-4666-8666-666666666666', 'Diagnostico eletronico', 1, 180.00, NOW()),

  -- OS-0011 (AGUARDANDO_APROVACAO - Lucas embreagem)
  ('aaaaaaaa-1111-4111-8111-000000000020', '11111111-aaaa-4aaa-8aaa-000000000011', '5e777777-7777-4777-8777-000000000001', 'Troca de embreagem', 1, 1200.00, NOW()),
  ('aaaaaaaa-1111-4111-8111-000000000021', '11111111-aaaa-4aaa-8aaa-000000000011', '5e444444-4444-4444-8444-444444444444', 'Revisao geral', 1,  400.00, NOW()),

  -- OS-0012 (AGUARDANDO_APROVACAO - Patricia revisao)
  ('aaaaaaaa-1111-4111-8111-000000000030', '11111111-aaaa-4aaa-8aaa-000000000012', '5e111111-1111-4111-8111-111111111111', 'Troca de oleo', 1, 150.00, NOW()),
  ('aaaaaaaa-1111-4111-8111-000000000031', '11111111-aaaa-4aaa-8aaa-000000000012', '5e777777-7777-4777-8777-000000000008', 'Troca de velas', 1, 120.00, NOW()),
  ('aaaaaaaa-1111-4111-8111-000000000032', '11111111-aaaa-4aaa-8aaa-000000000012', '5e444444-4444-4444-8444-444444444444', 'Revisao geral', 1, 400.00, NOW()),

  -- OS-0013 (AGUARDANDO_APROVACAO - Logistica injecao)
  ('aaaaaaaa-1111-4111-8111-000000000040', '11111111-aaaa-4aaa-8aaa-000000000013', '5e777777-7777-4777-8777-000000000009', 'Reparo de injecao eletronica', 1, 350.00, NOW()),
  ('aaaaaaaa-1111-4111-8111-000000000041', '11111111-aaaa-4aaa-8aaa-000000000013', '5e666666-6666-4666-8666-666666666666', 'Diagnostico eletronico', 1, 180.00, NOW()),

  -- OS-0014 (EM_EXECUCAO - Maria troca de oleo)
  ('aaaaaaaa-1111-4111-8111-000000000050', '11111111-aaaa-4aaa-8aaa-000000000014', '5e111111-1111-4111-8111-111111111111', 'Troca de oleo', 1, 150.00, NOW()),

  -- OS-0015 (EM_EXECUCAO - Rafael preventiva)
  ('aaaaaaaa-1111-4111-8111-000000000060', '11111111-aaaa-4aaa-8aaa-000000000015', '5e111111-1111-4111-8111-111111111111', 'Troca de oleo', 1, 150.00, NOW()),
  ('aaaaaaaa-1111-4111-8111-000000000061', '11111111-aaaa-4aaa-8aaa-000000000015', '5e777777-7777-4777-8777-000000000004', 'Troca de correia dentada', 1, 850.00, NOW()),
  ('aaaaaaaa-1111-4111-8111-000000000062', '11111111-aaaa-4aaa-8aaa-000000000015', '5e777777-7777-4777-8777-000000000008', 'Troca de velas', 1, 120.00, NOW()),

  -- OS-0016 (EM_EXECUCAO - Sigma cabecote)
  ('aaaaaaaa-1111-4111-8111-000000000070', '11111111-aaaa-4aaa-8aaa-000000000016', '5e444444-4444-4444-8444-444444444444', 'Revisao geral', 1, 400.00, NOW()),

  -- OS-0017 (FINALIZADA - Carlos pastilhas)
  ('aaaaaaaa-1111-4111-8111-000000000080', '11111111-aaaa-4aaa-8aaa-000000000017', '5e555555-5555-4555-8555-555555555555', 'Troca de pastilha de freio', 1, 250.00, NOW()),

  -- OS-0018 (FINALIZADA - Bia ar-condicionado)
  ('aaaaaaaa-1111-4111-8111-000000000090', '11111111-aaaa-4aaa-8aaa-000000000018', '5e777777-7777-4777-8777-000000000003', 'Recarga de ar-condicionado', 1, 220.00, NOW()),

  -- OS-0019 (FINALIZADA - Logistica bateria)
  ('aaaaaaaa-1111-4111-8111-000000000100', '11111111-aaaa-4aaa-8aaa-000000000019', '5e777777-7777-4777-8777-000000000002', 'Troca de bateria', 1,  90.00, NOW()),

  -- OS-0020 (ENTREGUE - Marcos alinhamento)
  ('aaaaaaaa-1111-4111-8111-000000000110', '11111111-aaaa-4aaa-8aaa-000000000020', '5e222222-2222-4222-8222-222222222222', 'Alinhamento', 1,  80.00, NOW()),
  ('aaaaaaaa-1111-4111-8111-000000000111', '11111111-aaaa-4aaa-8aaa-000000000020', '5e333333-3333-4333-8333-333333333333', 'Balanceamento', 1, 100.00, NOW()),

  -- OS-0021 (ENTREGUE - Rafael revisao 30k)
  ('aaaaaaaa-1111-4111-8111-000000000120', '11111111-aaaa-4aaa-8aaa-000000000021', '5e444444-4444-4444-8444-444444444444', 'Revisao geral', 1, 400.00, NOW()),

  -- OS-0022 (ENTREGUE - Juliana 4 pneus)
  ('aaaaaaaa-1111-4111-8111-000000000130', '11111111-aaaa-4aaa-8aaa-000000000022', '5e777777-7777-4777-8777-000000000010', 'Troca de pneus (4 unidades)', 1, 160.00, NOW()),

  -- OS-0023 (ENTREGUE - Pedro polimento)
  ('aaaaaaaa-1111-4111-8111-000000000140', '11111111-aaaa-4aaa-8aaa-000000000023', '5e777777-7777-4777-8777-000000000007', 'Polimento e cristalizacao', 1, 450.00, NOW()),

  -- OS-0027 / 0028 (ENTREGUE historico Joao)
  ('aaaaaaaa-1111-4111-8111-000000000170', '11111111-aaaa-4aaa-8aaa-000000000027', '5e111111-1111-4111-8111-111111111111', 'Troca de oleo', 1, 150.00, NOW()),
  ('aaaaaaaa-1111-4111-8111-000000000180', '11111111-aaaa-4aaa-8aaa-000000000028', '5e777777-7777-4777-8777-000000000002', 'Troca de bateria', 1,  90.00, NOW())
ON CONFLICT ("id") DO NOTHING;
