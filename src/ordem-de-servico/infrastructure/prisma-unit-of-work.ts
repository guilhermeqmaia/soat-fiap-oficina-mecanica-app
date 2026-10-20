import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UnitOfWork } from '../application/ports/unit-of-work';

/** Transacao interativa do Prisma como unit of work. */
@Injectable()
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly prisma: PrismaService) {}
  executar<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => fn(tx), { timeout: 15_000 });
  }
}
