import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '../../auth/infrastructure/decorators/public.decorator';
import { registry } from '../metrics.registry';

/**
 * Endpoint de scrape (US-F3-10). `@Public()` porque quem consome e o agente
 * DENTRO do cluster (DaemonSet/ServiceMonitor), sem JWT.
 *
 * Nao esta na lista de rotas publicas do API Gateway, entao continua
 * inalcancavel pela internet: de fora, cai no catch-all protegido.
 */
@Controller('metrics')
export class MetricsController {
  @Get()
  @Public()
  @ApiExcludeEndpoint()
  @Header('content-type', 'text/plain; version=0.0.4; charset=utf-8')
  async scrape(): Promise<string> {
    return registry.metrics();
  }
}
