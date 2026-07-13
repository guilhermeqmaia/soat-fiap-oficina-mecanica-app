-- Seed de METRICAS DE TEMPO (US-17): historico de OS ja CONCLUIDAS com itens de
-- servico executados (status_execucao='CONCLUIDO', horas_trabalhadas e fim_execucao
-- preenchidos). Sem isto o endpoint GET /ordens-servico/metricas/tempo-medio
-- retorna vazio, pois a metrica agrega AVG(horas_trabalhadas) apenas de itens
-- CONCLUIDO -- e os seeds 01/02 inserem itens sem execucao.
--
-- Ordem de execucao (prisma/seed.ts ordena *.sql alfabeticamente; o script k8s
-- roda 03 -> 01 -> 02 -> 04): quando este arquivo roda, ja existem os clientes,
-- veiculos e servicos (01+02) e o usuario mecanico (03).
--
-- 12 OS novas (OS-2026-2700000-0031..0042), todas ENTREGUE/FINALIZADA, com 17
-- itens CONCLUIDO distribuidos em 12 servicos. fim_execucao espalhado de 3 a 75
-- dias atras -> media geral ~1.8h (~106 min), nao-redonda e crivel.

-- ========== ORDENS DE SERVICO (12 novas, historico concluido) ==========
DO $$
DECLARE
  v_mecanico_id UUID := (SELECT id FROM "usuario" WHERE email = 'mecanico@oficina.com' LIMIT 1);
BEGIN

INSERT INTO "ordem_de_servico" ("id", "numero", "cliente_id", "veiculo_id", "usuario_id", "descricao_inicial", "diagnostico", "status", "created_at", "updated_at")
VALUES
  ('11111111-aaaa-4aaa-8aaa-000000000031', 'OS-2026-2700000-0031', 'c1111111-1111-4111-8111-000000000001', 'd1111111-1111-4111-8111-000000000001', v_mecanico_id,
   'Troca de oleo de rotina', 'Oleo e filtro trocados. Veiculo liberado.', 'ENTREGUE', NOW() - INTERVAL '8 days',  NOW() - INTERVAL '7 days'),
  ('11111111-aaaa-4aaa-8aaa-000000000032', 'OS-2026-2700000-0032', 'c1111111-1111-4111-8111-000000000002', 'd1111111-1111-4111-8111-000000000003', v_mecanico_id,
   'Direcao puxando para o lado', 'Alinhamento e balanceamento executados.', 'ENTREGUE', NOW() - INTERVAL '11 days', NOW() - INTERVAL '10 days'),
  ('11111111-aaaa-4aaa-8aaa-000000000033', 'OS-2026-2700000-0033', 'c1111111-1111-4111-8111-000000000003', 'd1111111-1111-4111-8111-000000000004', v_mecanico_id,
   'Revisao programada de 20.000km', 'Revisao geral concluida sem pendencias.', 'ENTREGUE', NOW() - INTERVAL '16 days', NOW() - INTERVAL '14 days'),
  ('11111111-aaaa-4aaa-8aaa-000000000034', 'OS-2026-2700000-0034', 'c1111111-1111-4111-8111-000000000004', 'd1111111-1111-4111-8111-000000000006', v_mecanico_id,
   'Ruido ao frear', 'Pastilhas dianteiras substituidas.', 'FINALIZADA', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'),
  ('11111111-aaaa-4aaa-8aaa-000000000035', 'OS-2026-2700000-0035', 'c1111111-1111-4111-8111-000000000005', 'd1111111-1111-4111-8111-000000000008', v_mecanico_id,
   'Manutencao preventiva de correia', 'Correia dentada e velas substituidas.', 'ENTREGUE', NOW() - INTERVAL '23 days', NOW() - INTERVAL '21 days'),
  ('11111111-aaaa-4aaa-8aaa-000000000036', 'OS-2026-2700000-0036', 'c1111111-1111-4111-8111-000000000006', 'd1111111-1111-4111-8111-000000000010', v_mecanico_id,
   'Troca dos 4 pneus', 'Pneus trocados e balanceados.', 'ENTREGUE', NOW() - INTERVAL '32 days', NOW() - INTERVAL '30 days'),
  ('11111111-aaaa-4aaa-8aaa-000000000037', 'OS-2026-2700000-0037', 'c1111111-1111-4111-8111-000000000007', 'd1111111-1111-4111-8111-000000000012', v_mecanico_id,
   'Embreagem patinando', 'Kit de embreagem substituido.', 'ENTREGUE', NOW() - INTERVAL '47 days', NOW() - INTERVAL '45 days'),
  ('11111111-aaaa-4aaa-8aaa-000000000038', 'OS-2026-2700000-0038', 'c1111111-1111-4111-8111-000000000008', 'd1111111-1111-4111-8111-000000000013', v_mecanico_id,
   'Ar-condicionado fraco', 'Recarga de gas e teste de pressao OK.', 'FINALIZADA', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),
  ('11111111-aaaa-4aaa-8aaa-000000000039', 'OS-2026-2700000-0039', 'c1111111-1111-4111-8111-000000000009', 'd1111111-1111-4111-8111-000000000014', v_mecanico_id,
   'Suspensao dianteira batendo', 'Amortecedores dianteiros e oleo trocados.', 'ENTREGUE', NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days'),
  ('11111111-aaaa-4aaa-8aaa-000000000040', 'OS-2026-2700000-0040', 'c1111111-1111-4111-8111-000000000012', 'd1111111-1111-4111-8111-000000000023', v_mecanico_id,
   'Luz de injecao acesa', 'Diagnostico eletronico realizado e falha sanada.', 'ENTREGUE', NOW() - INTERVAL '62 days', NOW() - INTERVAL '60 days'),
  ('11111111-aaaa-4aaa-8aaa-000000000041', 'OS-2026-2700000-0041', 'c1111111-1111-4111-8111-000000000010', 'd1111111-1111-4111-8111-000000000016', v_mecanico_id,
   'Manutencao de frota (van)', 'Troca de oleo e alinhamento da frota.', 'ENTREGUE', NOW() - INTERVAL '70 days', NOW() - INTERVAL '68 days'),
  ('11111111-aaaa-4aaa-8aaa-000000000042', 'OS-2026-2700000-0042', 'c1111111-1111-4111-8111-000000000011', 'd1111111-1111-4111-8111-000000000020', v_mecanico_id,
   'Revisao de caminhao', 'Revisao geral e balanceamento concluidos.', 'ENTREGUE', NOW() - INTERVAL '77 days', NOW() - INTERVAL '75 days')
ON CONFLICT ("id") DO NOTHING;

END $$;

-- ========== ITENS DE SERVICO CONCLUIDOS (alimentam a metrica de tempo) ==========
-- status_execucao='CONCLUIDO' + horas_trabalhadas + fim_execucao sao OBRIGATORIOS
-- para o item entrar em AVG(horas_trabalhadas). inicio_execucao e cosmetico.
INSERT INTO "item_ordem_de_servico_servico"
  ("id", "ordem_de_servico_id", "servico_id", "quantidade", "preco_unitario", "status_execucao", "inicio_execucao", "fim_execucao", "horas_trabalhadas", "created_at")
VALUES
  -- OS-0031: Troca de oleo (1.2h)
  ('dddddddd-1111-4111-8111-000000000001', '11111111-aaaa-4aaa-8aaa-000000000031', '5e111111-1111-4111-8111-111111111111', 1,  150.00, 'CONCLUIDO', NOW() - INTERVAL '7 days'  - INTERVAL '2 hours', NOW() - INTERVAL '7 days',  1.2, NOW() - INTERVAL '7 days'),
  -- OS-0032: Alinhamento (0.6h) + Balanceamento (0.8h)
  ('dddddddd-1111-4111-8111-000000000002', '11111111-aaaa-4aaa-8aaa-000000000032', '5e222222-2222-4222-8222-222222222222', 1,   80.00, 'CONCLUIDO', NOW() - INTERVAL '10 days' - INTERVAL '1 hours', NOW() - INTERVAL '10 days', 0.6, NOW() - INTERVAL '10 days'),
  ('dddddddd-1111-4111-8111-000000000003', '11111111-aaaa-4aaa-8aaa-000000000032', '5e333333-3333-4333-8333-333333333333', 1,  100.00, 'CONCLUIDO', NOW() - INTERVAL '10 days' - INTERVAL '1 hours', NOW() - INTERVAL '10 days', 0.8, NOW() - INTERVAL '10 days'),
  -- OS-0033: Revisao geral (3.4h)
  ('dddddddd-1111-4111-8111-000000000004', '11111111-aaaa-4aaa-8aaa-000000000033', '5e444444-4444-4444-8444-444444444444', 1,  400.00, 'CONCLUIDO', NOW() - INTERVAL '14 days' - INTERVAL '4 hours', NOW() - INTERVAL '14 days', 3.4, NOW() - INTERVAL '14 days'),
  -- OS-0034: Troca de pastilha (1.6h)
  ('dddddddd-1111-4111-8111-000000000005', '11111111-aaaa-4aaa-8aaa-000000000034', '5e555555-5555-4555-8555-555555555555', 1,  250.00, 'CONCLUIDO', NOW() - INTERVAL '3 days'  - INTERVAL '2 hours', NOW() - INTERVAL '3 days',  1.6, NOW() - INTERVAL '3 days'),
  -- OS-0035: Correia dentada (4.5h) + Troca de velas (0.5h)
  ('dddddddd-1111-4111-8111-000000000006', '11111111-aaaa-4aaa-8aaa-000000000035', '5e777777-7777-4777-8777-000000000004', 1,  850.00, 'CONCLUIDO', NOW() - INTERVAL '21 days' - INTERVAL '5 hours', NOW() - INTERVAL '21 days', 4.5, NOW() - INTERVAL '21 days'),
  ('dddddddd-1111-4111-8111-000000000007', '11111111-aaaa-4aaa-8aaa-000000000035', '5e777777-7777-4777-8777-000000000008', 1,  120.00, 'CONCLUIDO', NOW() - INTERVAL '21 days' - INTERVAL '1 hours', NOW() - INTERVAL '21 days', 0.5, NOW() - INTERVAL '21 days'),
  -- OS-0036: Troca de pneus (1.1h)
  ('dddddddd-1111-4111-8111-000000000008', '11111111-aaaa-4aaa-8aaa-000000000036', '5e777777-7777-4777-8777-000000000010', 1,  160.00, 'CONCLUIDO', NOW() - INTERVAL '30 days' - INTERVAL '2 hours', NOW() - INTERVAL '30 days', 1.1, NOW() - INTERVAL '30 days'),
  -- OS-0037: Troca de embreagem (5.5h)
  ('dddddddd-1111-4111-8111-000000000009', '11111111-aaaa-4aaa-8aaa-000000000037', '5e777777-7777-4777-8777-000000000001', 1, 1200.00, 'CONCLUIDO', NOW() - INTERVAL '45 days' - INTERVAL '6 hours', NOW() - INTERVAL '45 days', 5.5, NOW() - INTERVAL '45 days'),
  -- OS-0038: Recarga de ar-condicionado (0.9h)
  ('dddddddd-1111-4111-8111-000000000010', '11111111-aaaa-4aaa-8aaa-000000000038', '5e777777-7777-4777-8777-000000000003', 1,  220.00, 'CONCLUIDO', NOW() - INTERVAL '4 days'  - INTERVAL '1 hours', NOW() - INTERVAL '4 days',  0.9, NOW() - INTERVAL '4 days'),
  -- OS-0039: Amortecedores (2.7h) + Troca de oleo (1.0h)
  ('dddddddd-1111-4111-8111-000000000011', '11111111-aaaa-4aaa-8aaa-000000000039', '5e777777-7777-4777-8777-000000000005', 1,  550.00, 'CONCLUIDO', NOW() - INTERVAL '18 days' - INTERVAL '3 hours', NOW() - INTERVAL '18 days', 2.7, NOW() - INTERVAL '18 days'),
  ('dddddddd-1111-4111-8111-000000000012', '11111111-aaaa-4aaa-8aaa-000000000039', '5e111111-1111-4111-8111-111111111111', 1,  150.00, 'CONCLUIDO', NOW() - INTERVAL '18 days' - INTERVAL '1 hours', NOW() - INTERVAL '18 days', 1.0, NOW() - INTERVAL '18 days'),
  -- OS-0040: Diagnostico eletronico (1.3h)
  ('dddddddd-1111-4111-8111-000000000013', '11111111-aaaa-4aaa-8aaa-000000000040', '5e666666-6666-4666-8666-666666666666', 1,  180.00, 'CONCLUIDO', NOW() - INTERVAL '60 days' - INTERVAL '2 hours', NOW() - INTERVAL '60 days', 1.3, NOW() - INTERVAL '60 days'),
  -- OS-0041: Troca de oleo (0.9h) + Alinhamento (0.5h)
  ('dddddddd-1111-4111-8111-000000000014', '11111111-aaaa-4aaa-8aaa-000000000041', '5e111111-1111-4111-8111-111111111111', 1,  150.00, 'CONCLUIDO', NOW() - INTERVAL '68 days' - INTERVAL '1 hours', NOW() - INTERVAL '68 days', 0.9, NOW() - INTERVAL '68 days'),
  ('dddddddd-1111-4111-8111-000000000015', '11111111-aaaa-4aaa-8aaa-000000000041', '5e222222-2222-4222-8222-222222222222', 1,   80.00, 'CONCLUIDO', NOW() - INTERVAL '68 days' - INTERVAL '1 hours', NOW() - INTERVAL '68 days', 0.5, NOW() - INTERVAL '68 days'),
  -- OS-0042: Revisao geral (2.9h) + Balanceamento (0.7h)
  ('dddddddd-1111-4111-8111-000000000016', '11111111-aaaa-4aaa-8aaa-000000000042', '5e444444-4444-4444-8444-444444444444', 1,  400.00, 'CONCLUIDO', NOW() - INTERVAL '75 days' - INTERVAL '3 hours', NOW() - INTERVAL '75 days', 2.9, NOW() - INTERVAL '75 days'),
  ('dddddddd-1111-4111-8111-000000000017', '11111111-aaaa-4aaa-8aaa-000000000042', '5e333333-3333-4333-8333-333333333333', 1,  100.00, 'CONCLUIDO', NOW() - INTERVAL '75 days' - INTERVAL '1 hours', NOW() - INTERVAL '75 days', 0.7, NOW() - INTERVAL '75 days')
ON CONFLICT ("id") DO NOTHING;
