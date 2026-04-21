-- CreateTable
CREATE TABLE "item_ordem_de_servico_servico" (
    "id" TEXT NOT NULL,
    "ordem_de_servico_id" TEXT NOT NULL,
    "servico_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_unitario" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_ordem_de_servico_servico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "item_ordem_de_servico_servico_ordem_de_servico_id_servico_i_key" ON "item_ordem_de_servico_servico"("ordem_de_servico_id", "servico_id");

-- AddForeignKey
ALTER TABLE "item_ordem_de_servico_servico" ADD CONSTRAINT "item_ordem_de_servico_servico_ordem_de_servico_id_fkey" FOREIGN KEY ("ordem_de_servico_id") REFERENCES "ordem_de_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_ordem_de_servico_servico" ADD CONSTRAINT "item_ordem_de_servico_servico_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
