-- Add `ativo` column to cliente for soft delete support
ALTER TABLE "cliente" ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true;
