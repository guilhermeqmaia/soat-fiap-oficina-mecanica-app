import { Injectable } from '@nestjs/common';
import { HealthIndicator } from '@guilhermeqmaia/oficina-kit/health';
import { PrismaService } from '../prisma/prisma.service';

/** Readiness: o banco (RDS/Postgres) responde. Usado por `HealthModule.forRoot` do kit. */
@Injectable()
export class PrismaHealthIndicator implements HealthIndicator {
  readonly name = 'database';

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }
}
