-- Indice de expressao para a consulta da Lambda de autenticacao por CPF
-- (US-F3-01), que normaliza a coluna para comparar CPF com e sem mascara:
--
--   WHERE regexp_replace("cpf_cnpj", '[^0-9]', '', 'g') = $1
--
-- Envolver a coluna em funcao torna o indice unico de `cpf_cnpj` inutilizavel
-- e forca sequential scan da tabela `cliente` a CADA login. A expressao aqui e
-- IDENTICA a da query (requisito para o planner usar o indice) e
-- `regexp_replace` e IMMUTABLE, entao pode ser indexada.
CREATE INDEX IF NOT EXISTS "cliente_cpf_cnpj_digits_idx"
  ON "cliente" ((regexp_replace("cpf_cnpj", '[^0-9]', '', 'g')));

-- Nota: o Prisma nao representa indices de expressao no schema.prisma; este
-- indice existe apenas aqui. Um `prisma migrate dev` pode reporta-lo como
-- drift — nao remova: sem ele todo login por CPF vira sequential scan.
