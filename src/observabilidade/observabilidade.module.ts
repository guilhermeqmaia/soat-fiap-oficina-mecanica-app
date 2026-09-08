import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsController } from './infrastructure/metrics.controller';
import { MetricsInterceptor } from './infrastructure/metrics.interceptor';
import { OsMetricsListener } from './application/os-metrics.listener';

/** Instrumentacao da aplicacao (US-F3-10): metricas HTTP, processo e negocio. */
@Module({
  controllers: [MetricsController],
  providers: [
    OsMetricsListener,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
})
export class ObservabilidadeModule {}
