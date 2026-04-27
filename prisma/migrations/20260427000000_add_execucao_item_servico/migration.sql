-- CreateEnum
CREATE TYPE "StatusExecucaoItem" AS ENUM ('PENDENTE', 'EM_EXECUCAO', 'CONCLUIDO');

-- AlterTable
ALTER TABLE "item_ordem_de_servico_servico"
  ADD COLUMN "status_execucao" "StatusExecucaoItem" NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN "inicio_execucao" TIMESTAMP(3),
  ADD COLUMN "fim_execucao" TIMESTAMP(3),
  ADD COLUMN "horas_trabalhadas" DOUBLE PRECISION;
