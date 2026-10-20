-- US-F4-06 (OS Service, Fase 4): status AGUARDANDO_PAGAMENTO, itens viram snapshot
-- (sem FK para catalogo/estoque, que migram para o Execucao Service), motivo de
-- cancelamento; tabelas de catalogo/estoque removidas (RFC-0004).

-- AlterEnum
ALTER TYPE "StatusOrdemDeServico" ADD VALUE 'AGUARDANDO_PAGAMENTO';

-- DropForeignKey
ALTER TABLE "item_ordem_de_servico_produto" DROP CONSTRAINT "item_ordem_de_servico_produto_produto_id_fkey";

-- DropForeignKey
ALTER TABLE "item_ordem_de_servico_servico" DROP CONSTRAINT "item_ordem_de_servico_servico_servico_id_fkey";

-- DropForeignKey
ALTER TABLE "movimentacao_estoque" DROP CONSTRAINT "movimentacao_estoque_produto_id_fkey";

-- AlterTable
-- Snapshot (RFC-0004): nome congelado no diagnostico. DEFAULT so para linhas pre-existentes.
ALTER TABLE "item_ordem_de_servico_produto" ADD COLUMN     "nome" TEXT NOT NULL DEFAULT '';
ALTER TABLE "item_ordem_de_servico_produto" ALTER COLUMN "nome" DROP DEFAULT;

-- AlterTable
ALTER TABLE "item_ordem_de_servico_servico" DROP COLUMN "fim_execucao",
DROP COLUMN "horas_trabalhadas",
DROP COLUMN "inicio_execucao",
DROP COLUMN "status_execucao",
ADD COLUMN     "nome" TEXT NOT NULL DEFAULT '';
ALTER TABLE "item_ordem_de_servico_servico" ALTER COLUMN "nome" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ordem_de_servico" ADD COLUMN     "motivo_cancelamento" TEXT;

-- Backfill (dados da Fase 3): congela o nome do catalogo nos itens existentes ANTES de
-- derrubar as tabelas — sem isto as OS antigas ficariam com itens sem nome para sempre.
UPDATE "item_ordem_de_servico_servico" i SET "nome" = s."nome" FROM "servico" s WHERE s."id" = i."servico_id" AND i."nome" = '';
UPDATE "item_ordem_de_servico_produto" i SET "nome" = p."nome" FROM "produto" p WHERE p."id" = i."produto_id" AND i."nome" = '';

-- DropTable
DROP TABLE "movimentacao_estoque";

-- DropTable
DROP TABLE "produto";

-- DropTable
DROP TABLE "servico";

-- DropEnum
DROP TYPE "StatusExecucaoItem";

-- DropEnum
DROP TYPE "TipoMovimentacaoEstoque";

-- RenameForeignKey
ALTER TABLE "item_ordem_de_servico_produto" RENAME CONSTRAINT "item_ordem_de_servico_produto_item_servico_id_fkey" TO "item_ordem_de_servico_produto_item_ordem_de_servico_servic_fkey";

-- RenameIndex
ALTER INDEX "item_ordem_de_servico_produto_item_servico_id_produto_id_key" RENAME TO "item_ordem_de_servico_produto_item_ordem_de_servico_servico_key";

