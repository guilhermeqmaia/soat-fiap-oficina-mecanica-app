-- Seed de NOTIFICACOES (US-20). Os seeds inserem OS via SQL direto, sem passar
-- pelos eventos de dominio (OrcamentoPronto/OsFinalizada/OsStatusAlterado), entao
-- a tela de Notificacoes (admin e portal do cliente) fica vazia. Este arquivo
-- popula um historico realista vinculado as OS ja semeadas.
--
-- Consulta: admin GET /notificacoes (filtra por cliente_id/tipo/status); cliente
-- GET /clientes/:cpfCnpj/notificacoes (resolve cpfCnpj -> cliente_id). O
-- `destinatario` e o e-mail do cliente. `enviada_em` fica NULL p/ PENDENTE/FALHOU.
--
-- Roda depois de 01/02 (clientes+OS) e 04 (OS 0031/0035). Alfabeticamente (seed.ts)
-- e no loop do script k8s, 05 e o ultimo.
--
-- Distribuicao: 13 ENVIADA + 1 PENDENTE + 1 FALHOU; tipos ORCAMENTO_PRONTO,
-- OS_FINALIZADA e STATUS_OS_ALTERADO. O cliente Joao (cliente@oficina.com) recebe
-- 4 (p/ demo do portal do cliente).

INSERT INTO "notificacao"
  ("id", "cliente_id", "ordem_de_servico_id", "tipo", "canal", "destinatario", "assunto", "mensagem", "status", "erro", "enviada_em", "created_at")
VALUES
  -- ===== Joao (cliente@oficina.com) — aparece no portal do cliente =====
  ('eeee0001-1111-4111-8111-000000000001', '11111111-1111-4111-8111-111111111111', '11111111-aaaa-4aaa-8aaa-000000000010',
   'ORCAMENTO_PRONTO', 'EMAIL', 'cliente@oficina.com',
   'Orcamento da OS OS-2026-2700000-0010 pronto para aprovacao',
   E'Ola Joao da Silva,\n\nO orcamento da sua Ordem de Servico OS-2026-2700000-0010 esta pronto.\nValor total estimado: R$ 430,00\n',
   'ENVIADA', NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

  ('eeee0001-1111-4111-8111-000000000002', '11111111-1111-4111-8111-111111111111', '11111111-aaaa-4aaa-8aaa-000000000027',
   'OS_FINALIZADA', 'EMAIL', 'cliente@oficina.com',
   'OS OS-2026-2700000-0027 finalizada - veiculo pronto para retirada',
   E'Ola Joao da Silva,\n\nSua Ordem de Servico OS-2026-2700000-0027 foi finalizada e o veiculo esta pronto para retirada.\n',
   'ENVIADA', NULL, NOW() - INTERVAL '89 days', NOW() - INTERVAL '89 days'),

  ('eeee0001-1111-4111-8111-000000000003', '11111111-1111-4111-8111-111111111111', '11111111-aaaa-4aaa-8aaa-000000000027',
   'STATUS_OS_ALTERADO', 'EMAIL', 'cliente@oficina.com',
   'Status da OS OS-2026-2700000-0027: ENTREGUE',
   E'Status da Ordem de Servico OS-2026-2700000-0027 alterado.\n\nStatus anterior: FINALIZADA\nStatus atual: ENTREGUE\n',
   'ENVIADA', NULL, NOW() - INTERVAL '88 days', NOW() - INTERVAL '88 days'),

  ('eeee0001-1111-4111-8111-000000000004', '11111111-1111-4111-8111-111111111111', '11111111-aaaa-4aaa-8aaa-000000000028',
   'OS_FINALIZADA', 'EMAIL', 'cliente@oficina.com',
   'OS OS-2026-2700000-0028 finalizada - veiculo pronto para retirada',
   E'Ola Joao da Silva,\n\nSua Ordem de Servico OS-2026-2700000-0028 foi finalizada e o veiculo esta pronto para retirada.\n',
   'ENVIADA', NULL, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),

  -- ===== Orcamentos prontos (outros clientes) =====
  ('eeee0001-1111-4111-8111-000000000005', 'c1111111-1111-4111-8111-000000000009', '11111111-aaaa-4aaa-8aaa-000000000011',
   'ORCAMENTO_PRONTO', 'EMAIL', 'lucas@email.com',
   'Orcamento da OS OS-2026-2700000-0011 pronto para aprovacao',
   E'Ola Lucas Martins,\n\nO orcamento da sua Ordem de Servico OS-2026-2700000-0011 esta pronto.\nValor total estimado: R$ 1.600,00\n',
   'ENVIADA', NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

  ('eeee0001-1111-4111-8111-000000000006', 'c1111111-1111-4111-8111-000000000012', '11111111-aaaa-4aaa-8aaa-000000000012',
   'ORCAMENTO_PRONTO', 'EMAIL', 'patricia@email.com',
   'Orcamento da OS OS-2026-2700000-0012 pronto para aprovacao',
   E'Ola Patricia Gomes,\n\nO orcamento da sua Ordem de Servico OS-2026-2700000-0012 esta pronto.\nValor total estimado: R$ 670,00\n',
   'ENVIADA', NULL, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),

  ('eeee0001-1111-4111-8111-000000000007', 'c1111111-1111-4111-8111-000000000010', '11111111-aaaa-4aaa-8aaa-000000000013',
   'ORCAMENTO_PRONTO', 'EMAIL', 'frota@veloz.com.br',
   'Orcamento da OS OS-2026-2700000-0013 pronto para aprovacao',
   E'Ola Logistica Veloz LTDA,\n\nO orcamento da sua Ordem de Servico OS-2026-2700000-0013 esta pronto.\nValor total estimado: R$ 530,00\n',
   'ENVIADA', NULL, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours'),

  -- ===== OS finalizadas (equipe/board) =====
  ('eeee0001-1111-4111-8111-000000000008', 'c1111111-1111-4111-8111-000000000001', '11111111-aaaa-4aaa-8aaa-000000000017',
   'OS_FINALIZADA', 'EMAIL', 'carlos@email.com',
   'OS OS-2026-2700000-0017 finalizada - veiculo pronto para retirada',
   E'Ola Carlos Mendes,\n\nSua Ordem de Servico OS-2026-2700000-0017 foi finalizada e o veiculo esta pronto para retirada.\n',
   'ENVIADA', NULL, NOW() - INTERVAL '8 hours', NOW() - INTERVAL '8 hours'),

  ('eeee0001-1111-4111-8111-000000000009', 'c1111111-1111-4111-8111-000000000004', '11111111-aaaa-4aaa-8aaa-000000000018',
   'OS_FINALIZADA', 'EMAIL', 'bia@email.com',
   'OS OS-2026-2700000-0018 finalizada - veiculo pronto para retirada',
   E'Ola Beatriz Almeida,\n\nSua Ordem de Servico OS-2026-2700000-0018 foi finalizada e o veiculo esta pronto para retirada.\n',
   'ENVIADA', NULL, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),

  ('eeee0001-1111-4111-8111-000000000010', 'c1111111-1111-4111-8111-000000000001', '11111111-aaaa-4aaa-8aaa-000000000031',
   'OS_FINALIZADA', 'EMAIL', 'carlos@email.com',
   'OS OS-2026-2700000-0031 finalizada - veiculo pronto para retirada',
   E'Ola Carlos Mendes,\n\nSua Ordem de Servico OS-2026-2700000-0031 foi finalizada e o veiculo esta pronto para retirada.\n',
   'ENVIADA', NULL, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),

  ('eeee0001-1111-4111-8111-000000000011', 'c1111111-1111-4111-8111-000000000005', '11111111-aaaa-4aaa-8aaa-000000000035',
   'OS_FINALIZADA', 'EMAIL', 'rafa@email.com',
   'OS OS-2026-2700000-0035 finalizada - veiculo pronto para retirada',
   E'Ola Rafael Costa,\n\nSua Ordem de Servico OS-2026-2700000-0035 foi finalizada e o veiculo esta pronto para retirada.\n',
   'ENVIADA', NULL, NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days'),

  -- ===== Mudancas de status =====
  ('eeee0001-1111-4111-8111-000000000012', 'c1111111-1111-4111-8111-000000000002', '11111111-aaaa-4aaa-8aaa-000000000024',
   'STATUS_OS_ALTERADO', 'EMAIL', 'ana.souza@email.com',
   'Status da OS OS-2026-2700000-0024: CANCELADA',
   E'Status da Ordem de Servico OS-2026-2700000-0024 alterado.\n\nStatus anterior: AGUARDANDO_APROVACAO\nStatus atual: CANCELADA\n',
   'ENVIADA', NULL, NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days'),

  -- ===== PENDENTE (ainda nao enviada) =====
  ('eeee0001-1111-4111-8111-000000000013', '22222222-2222-4222-8222-222222222222', '11111111-aaaa-4aaa-8aaa-000000000014',
   'STATUS_OS_ALTERADO', 'EMAIL', 'maria@example.com',
   'Status da OS OS-2026-2700000-0014: EM_EXECUCAO',
   E'Status da Ordem de Servico OS-2026-2700000-0014 alterado.\n\nStatus anterior: AGUARDANDO_APROVACAO\nStatus atual: EM_EXECUCAO\n',
   'PENDENTE', NULL, NULL, NOW() - INTERVAL '6 hours'),

  -- ===== FALHOU (com erro) =====
  ('eeee0001-1111-4111-8111-000000000014', '33333333-3333-4333-8333-333333333333', '11111111-aaaa-4aaa-8aaa-000000000026',
   'STATUS_OS_ALTERADO', 'EMAIL', 'contato@autopecas.br',
   'Status da OS OS-2026-2700000-0026: CANCELADA',
   E'Status da Ordem de Servico OS-2026-2700000-0026 alterado.\n\nStatus anterior: AGUARDANDO_APROVACAO\nStatus atual: CANCELADA\n',
   'FALHOU', 'Timeout ao enviar e-mail (SMTP 550: mailbox unavailable)', NULL, NOW() - INTERVAL '7 days')
ON CONFLICT ("id") DO NOTHING;
