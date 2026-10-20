import { PrismaHealthIndicator } from './prisma-health.indicator';
import { PrismaService } from '../prisma/prisma.service';

const prisma = (impl: () => Promise<unknown>) => ({ $queryRaw: jest.fn(impl) }) as unknown as PrismaService;

describe('PrismaHealthIndicator', () => {
  it('passa quando o banco responde', async () => {
    const p = prisma(async () => [{ ok: 1 }]);
    await expect(new PrismaHealthIndicator(p).check()).resolves.toBeUndefined();
    expect(p.$queryRaw).toHaveBeenCalled();
  });

  it('propaga o erro quando o banco nao responde (vira 503 no /health/ready)', async () => {
    const p = prisma(async () => {
      throw new Error('connection refused');
    });
    await expect(new PrismaHealthIndicator(p).check()).rejects.toThrow('connection refused');
  });
});
