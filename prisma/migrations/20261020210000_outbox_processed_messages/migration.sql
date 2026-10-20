-- Mensageria do OS Service (US-F4-06, ADR-0009): outbox transacional + dedup do consumidor.
CREATE TABLE "outbox" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "envelope" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "criada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviada_em" TIMESTAMP(3),
    "ultimo_erro" TEXT,

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outbox_status_criada_em_idx" ON "outbox"("status", "criada_em");

CREATE TABLE "processed_messages" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_messages_pkey" PRIMARY KEY ("id")
);
