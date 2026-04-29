-- CreateEnum
CREATE TYPE "TipoMovimentacaoEstoque" AS ENUM ('ENTRADA', 'SAIDA', 'RESERVA', 'ESTORNO_RESERVA', 'BAIXA');

-- CreateTable
CREATE TABLE "movimentacao_estoque" (
    "id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "tipo" "TipoMovimentacaoEstoque" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "estoque_resultante" INTEGER NOT NULL,
    "ordem_de_servico_id" TEXT,
    "motivo" TEXT,
    "usuario_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacao_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "movimentacao_estoque_produto_id_created_at_idx"
  ON "movimentacao_estoque"("produto_id", "created_at");

-- CreateIndex
CREATE INDEX "movimentacao_estoque_ordem_de_servico_id_idx"
  ON "movimentacao_estoque"("ordem_de_servico_id");

-- AddForeignKey
ALTER TABLE "movimentacao_estoque"
  ADD CONSTRAINT "movimentacao_estoque_produto_id_fkey"
  FOREIGN KEY ("produto_id") REFERENCES "produto"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
