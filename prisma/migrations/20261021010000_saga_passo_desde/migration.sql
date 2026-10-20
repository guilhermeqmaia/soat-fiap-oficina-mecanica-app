-- Review da US-F4-10: instante de entrada no passo atual (duracao por passo e alerta de saga parada).
ALTER TABLE "saga_os" ADD COLUMN "passo_desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "saga_os_status_passo_desde_idx" ON "saga_os"("status", "passo_desde");
