-- US-F4-10: estado da saga orquestrada da OS (RFC-0005).
CREATE TABLE "saga_os" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "veiculo_id" TEXT NOT NULL,
    "descricao_problema" TEXT NOT NULL,
    "passo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "historico" JSONB NOT NULL DEFAULT '[]',
    "compensacoes" JSONB NOT NULL DEFAULT '[]',
    "prazo_aprovacao" TIMESTAMP(3),
    "prazo_pagamento" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saga_os_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saga_os_numero_key" ON "saga_os"("numero");
CREATE INDEX "saga_os_status_prazo_aprovacao_idx" ON "saga_os"("status", "prazo_aprovacao");
CREATE INDEX "saga_os_status_prazo_pagamento_idx" ON "saga_os"("status", "prazo_pagamento");
