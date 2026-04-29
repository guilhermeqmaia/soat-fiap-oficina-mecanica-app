-- CreateTable
CREATE TABLE "item_ordem_de_servico_produto" (
    "id" TEXT NOT NULL,
    "ordem_de_servico_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_unitario" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_ordem_de_servico_produto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "item_ordem_de_servico_produto_ordem_de_servico_id_produto_id_key" ON "item_ordem_de_servico_produto"("ordem_de_servico_id", "produto_id");

-- AddForeignKey
ALTER TABLE "item_ordem_de_servico_produto" ADD CONSTRAINT "item_ordem_de_servico_produto_ordem_de_servico_id_fkey" FOREIGN KEY ("ordem_de_servico_id") REFERENCES "ordem_de_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_ordem_de_servico_produto" ADD CONSTRAINT "item_ordem_de_servico_produto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
