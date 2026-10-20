import { Module } from '@nestjs/common';
import { OsMetricsListener } from './application/os-metrics.listener';

/**
 * Metricas de negocio da aplicacao (US-F3-10). A infra de observabilidade
 * (`/metrics`, latencia HTTP, metricas de processo, tracing) vem do kit —
 * `MetricsModule.forRoot` no `AppModule`.
 */
@Module({ providers: [OsMetricsListener] })
export class ObservabilidadeModule {}
