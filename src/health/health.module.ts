import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * Modulo de health checks. O `PrismaService` e injetado a partir do
 * `PrismaModule` (global), entao nao e preciso importa-lo aqui.
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
