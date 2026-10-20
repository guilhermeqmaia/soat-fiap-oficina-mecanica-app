import type { ExecutionContext } from '@nestjs/common';
import {
  THROTTLER_LIMIT,
  THROTTLER_TTL_MS,
  isRotaDeInfra,
  shouldSkipThrottling,
} from './throttler.config';

const httpContext = (path: string, type = 'http'): ExecutionContext =>
  ({
    getType: () => type,
    switchToHttp: () => ({ getRequest: () => ({ path }) }),
  }) as unknown as ExecutionContext;

describe('throttler.config', () => {
  describe('shouldSkipThrottling', () => {
    it('nao ignora o throttler num ambiente de producao limpo', () => {
      expect(shouldSkipThrottling({ NODE_ENV: 'production' })).toBe(false);
    });

    it('ignora quando THROTTLER_DISABLED === "true" (hook de teste de carga)', () => {
      expect(
        shouldSkipThrottling({
          NODE_ENV: 'production',
          THROTTLER_DISABLED: 'true',
        }),
      ).toBe(true);
    });

    it('nao ignora quando THROTTLER_DISABLED tem outro valor', () => {
      expect(
        shouldSkipThrottling({
          NODE_ENV: 'production',
          THROTTLER_DISABLED: 'false',
        }),
      ).toBe(false);
      expect(
        shouldSkipThrottling({
          NODE_ENV: 'production',
          THROTTLER_DISABLED: '1',
        }),
      ).toBe(false);
    });

    it('ignora quando NODE_ENV === "test"', () => {
      expect(shouldSkipThrottling({ NODE_ENV: 'test' })).toBe(true);
    });

    it('ignora quando JEST_WORKER_ID esta presente', () => {
      expect(
        shouldSkipThrottling({ NODE_ENV: 'production', JEST_WORKER_ID: '1' }),
      ).toBe(true);
    });

    it('nao ignora com JEST_WORKER_ID vazio', () => {
      expect(
        shouldSkipThrottling({ NODE_ENV: 'production', JEST_WORKER_ID: '' }),
      ).toBe(false);
    });

    it('usa process.env por padrao quando nenhum env e passado', () => {
      const original = process.env.THROTTLER_DISABLED;
      process.env.THROTTLER_DISABLED = 'true';
      try {
        expect(shouldSkipThrottling()).toBe(true);
      } finally {
        if (original === undefined) delete process.env.THROTTLER_DISABLED;
        else process.env.THROTTLER_DISABLED = original;
      }
    });
  });

  describe('isRotaDeInfra (probes/scrape vindos do kit, sem @SkipThrottle)', () => {
    it('ignora o throttler em /health, /health/ready e /metrics', () => {
      for (const path of ['/health', '/health/ready', '/metrics']) {
        expect(isRotaDeInfra(httpContext(path))).toBe(true);
        expect(shouldSkipThrottling({ NODE_ENV: 'production' }, httpContext(path))).toBe(true);
      }
    });

    it('nao ignora rotas de negocio nem prefixos parecidos', () => {
      for (const path of ['/clientes', '/healthcheck', '/metricsx', '/ordens-servico/health']) {
        expect(isRotaDeInfra(httpContext(path))).toBe(false);
      }
      expect(shouldSkipThrottling({ NODE_ENV: 'production' }, httpContext('/clientes'))).toBe(false);
    });

    it('e falso sem contexto, fora de HTTP ou sem path', () => {
      expect(isRotaDeInfra()).toBe(false);
      expect(isRotaDeInfra(httpContext('/health', 'rpc'))).toBe(false);
      expect(isRotaDeInfra(httpContext(undefined as unknown as string))).toBe(false);
    });
  });

  it('expoe as constantes de limite/ttl usadas pelo ThrottlerModule', () => {
    expect(THROTTLER_TTL_MS).toBe(60_000);
    expect(THROTTLER_LIMIT).toBe(100);
  });
});
