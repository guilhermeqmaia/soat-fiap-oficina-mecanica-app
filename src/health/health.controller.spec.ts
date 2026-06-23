import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

function makePrisma(queryImpl: () => Promise<unknown>): PrismaService {
  return { $queryRaw: jest.fn(queryImpl) } as unknown as PrismaService;
}

describe('HealthController', () => {
  it('liveness returns ok', () => {
    const controller = new HealthController(makePrisma(async () => [{ ok: 1 }]));
    expect(controller.liveness()).toEqual({ status: 'ok' });
  });

  it('readiness returns ready when the database responds', async () => {
    const controller = new HealthController(makePrisma(async () => [{ ok: 1 }]));
    await expect(controller.readiness()).resolves.toEqual({ status: 'ready' });
  });

  it('readiness throws 503 when the database is unreachable', async () => {
    const controller = new HealthController(
      makePrisma(async () => {
        throw new Error('connection refused');
      }),
    );
    await expect(controller.readiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
