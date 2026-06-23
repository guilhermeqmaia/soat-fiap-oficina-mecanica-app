import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/infrastructure/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Endpoints de health para probes do orquestrador (ex.: Kubernetes).
 * Publicos (sem JWT) e isentos de rate-limit, pois sao chamados de forma
 * recorrente pela plataforma.
 */
@ApiTags('Health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: o processo esta de pe e respondendo. */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Liveness probe' })
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  /** Readiness: pronto para receber trafego (dependencias criticas OK). */
  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness probe (verifica conectividade com o banco)' })
  async readiness(): Promise<{ status: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'not-ready',
        database: 'unreachable',
      });
    }
  }
}
