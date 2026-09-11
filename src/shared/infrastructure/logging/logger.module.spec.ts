import { ConfigService } from '@nestjs/config';
import { buildPinoHttpOptions } from './logger.module';
import { runWithCorrelation } from './correlation-context';
import { REDACT_PATHS } from './redact-paths';
import {
  registrarTracer,
  resetTracerBridge,
} from '../tracing/tracer-bridge';

function makeConfig(values: Record<string, string>): ConfigService {
  return {
    get: jest.fn((key: string, defaultValue?: string) => values[key] ?? defaultValue),
  } as unknown as ConfigService;
}

describe('buildPinoHttpOptions', () => {
  it('usa nivel debug fora de producao por default', () => {
    const options = buildPinoHttpOptions(makeConfig({ NODE_ENV: 'development' }));
    expect(options.level).toBe('debug');
  });

  it('usa nivel info em producao por default', () => {
    const options = buildPinoHttpOptions(makeConfig({ NODE_ENV: 'production' }));
    expect(options.level).toBe('info');
  });

  it('LOG_LEVEL explicito tem precedencia sobre o default por ambiente', () => {
    const options = buildPinoHttpOptions(
      makeConfig({ NODE_ENV: 'production', LOG_LEVEL: 'warn' }),
    );
    expect(options.level).toBe('warn');
  });

  it('fica silencioso em ambiente de teste independente de LOG_LEVEL', () => {
    const options = buildPinoHttpOptions(
      makeConfig({ NODE_ENV: 'test', LOG_LEVEL: 'debug' }),
    );
    expect(options.level).toBe('silent');
    expect(options.autoLogging).toBe(false);
  });

  it('aplica os paths de redacao configurados', () => {
    const options = buildPinoHttpOptions(makeConfig({ NODE_ENV: 'production' }));
    expect(options.redact).toEqual({ paths: REDACT_PATHS, censor: '[REDACTED]' });
  });

  it('mixin inclui correlationId/traceId do AsyncLocalStorage quando presente', () => {
    const options = buildPinoHttpOptions(makeConfig({ NODE_ENV: 'production' }));
    const withoutContext = options.mixin!({}, 30, {} as never);
    expect(withoutContext).toEqual({});

    const withContext = runWithCorrelation(
      { correlationId: 'cid-1', traceId: 'trace-1' },
      () => options.mixin!({}, 30, {} as never),
    );
    expect(withContext).toEqual({ correlationId: 'cid-1', traceId: 'trace-1' });
  });

  it('mixin emite dd.trace_id/span_id do span de APM ativo (correlacao log<->trace)', () => {
    const span = {
      setTag: jest.fn(),
      context: () => ({ toTraceId: () => 'apm-trace', toSpanId: () => 'apm-span' }),
    };
    registrarTracer({ scope: () => ({ active: () => span }) } as never);

    try {
      const options = buildPinoHttpOptions(makeConfig({ NODE_ENV: 'production' }));
      const emitido = runWithCorrelation(
        { correlationId: 'cid-1', traceId: 'header-trace' },
        () => options.mixin!({}, 30, {} as never),
      );

      // traceId do span vence o do header; dd.* no formato que o Datadog casa.
      expect(emitido).toEqual({
        correlationId: 'cid-1',
        traceId: 'apm-trace',
        dd: { trace_id: 'apm-trace', span_id: 'apm-span' },
      });
    } finally {
      resetTracerBridge();
    }
  });

  it('customSuccessObject expoe method/path/statusCode/userId/role e preserva val', () => {
    const options = buildPinoHttpOptions(makeConfig({ NODE_ENV: 'production' }));
    const req = { method: 'GET', url: '/clientes', user: { id: 'u1', role: 'ADMIN' } };
    const res = { statusCode: 200 };
    expect(
      options.customSuccessObject!(req as any, res as any, { latencyMs: 5 } as any),
    ).toEqual({
      latencyMs: 5,
      method: 'GET',
      path: '/clientes',
      statusCode: 200,
      userId: 'u1',
      role: 'ADMIN',
    });
  });

  it('customErrorObject expoe method/path/statusCode/userId/role e preserva val', () => {
    const options = buildPinoHttpOptions(makeConfig({ NODE_ENV: 'production' }));
    const req = { method: 'POST', url: '/ordens-servico', user: undefined };
    const res = { statusCode: 500 };
    expect(
      options.customErrorObject!(
        req as any,
        res as any,
        new Error('boom'),
        { latencyMs: 9 } as any,
      ),
    ).toEqual({
      latencyMs: 9,
      method: 'POST',
      path: '/ordens-servico',
      statusCode: 500,
      userId: undefined,
      role: undefined,
    });
  });
});
