-- Lock otimista da OS (review US-F4-06): cancelar/entregar por HTTP e transicoes por evento
-- concorrem pela mesma linha; o update exige a versao lida e falha com 409 / retry no consumer.
ALTER TABLE "ordem_de_servico" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- Purga periodica de processed_messages (ADR-0009: TTL de 7 dias).
CREATE INDEX "processed_messages_processada_em_idx" ON "processed_messages"("processada_em");
