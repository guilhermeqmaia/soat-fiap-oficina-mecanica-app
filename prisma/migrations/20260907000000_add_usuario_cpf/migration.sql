-- US-F3-03: CPF do staff para o login na Lambda (RFC-0003).
-- Nullable: usuarios existentes ganham CPF via atualizacao de cadastro;
-- normalizado (so digitos) e unico — a Lambda consulta por igualdade direta.
ALTER TABLE "usuario" ADD COLUMN "cpf" TEXT;

CREATE UNIQUE INDEX "usuario_cpf_key" ON "usuario"("cpf");
