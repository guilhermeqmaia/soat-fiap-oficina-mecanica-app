-- CreateTable
CREATE TABLE "ordem_de_servico" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "veiculo_id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "descricao_inicial" TEXT NOT NULL,
    "diagnostico" TEXT,
    "status" "StatusOrdemDeServico" NOT NULL DEFAULT 'RECEBIDA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordem_de_servico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ordem_de_servico_numero_key" ON "ordem_de_servico"("numero");

-- AddForeignKey
ALTER TABLE "ordem_de_servico" ADD CONSTRAINT "ordem_de_servico_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_de_servico" ADD CONSTRAINT "ordem_de_servico_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_de_servico" ADD CONSTRAINT "ordem_de_servico_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
