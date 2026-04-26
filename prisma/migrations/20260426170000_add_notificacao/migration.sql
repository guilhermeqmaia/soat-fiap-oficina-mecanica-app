-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('ORCAMENTO_PRONTO', 'OS_FINALIZADA');

-- CreateEnum
CREATE TYPE "CanalNotificacao" AS ENUM ('EMAIL');

-- CreateEnum
CREATE TYPE "StatusNotificacao" AS ENUM ('PENDENTE', 'ENVIADA', 'FALHOU');

-- CreateTable
CREATE TABLE "notificacao" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "ordem_de_servico_id" TEXT,
    "tipo" "TipoNotificacao" NOT NULL,
    "canal" "CanalNotificacao" NOT NULL,
    "destinatario" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "status" "StatusNotificacao" NOT NULL,
    "erro" TEXT,
    "enviada_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificacao_cliente_id_idx" ON "notificacao"("cliente_id");

-- CreateIndex
CREATE INDEX "notificacao_ordem_de_servico_id_idx" ON "notificacao"("ordem_de_servico_id");
