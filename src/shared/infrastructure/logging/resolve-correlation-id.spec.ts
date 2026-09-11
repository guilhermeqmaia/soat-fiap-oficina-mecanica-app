import {
  extractTraceIdFromAmznTraceId,
  extractTraceIdFromTraceparent,
  resolveCorrelationId,
  resolveUpstreamTraceId,
} from './resolve-correlation-id';

const TRACEPARENT = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
const AMZN =
  'Root=1-67891233-abcdef012345678912345678;Parent=53995c3f42cd8ad8;Sampled=1';

describe('resolveCorrelationId', () => {
  it('usa x-correlation-id quando presente', () => {
    expect(
      resolveCorrelationId({ 'x-correlation-id': 'cid-1', 'x-request-id': 'rid-1' }),
    ).toBe('cid-1');
  });

  it('cai pro x-request-id quando nao tem x-correlation-id', () => {
    expect(resolveCorrelationId({ 'x-request-id': 'rid-1' })).toBe('rid-1');
  });

  it('cai pro trace-id do traceparent quando nao tem nenhum dos dois', () => {
    const traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
    expect(resolveCorrelationId({ traceparent })).toBe(
      '4bf92f3577b34da6a3ce929d0e0e4736',
    );
  });

  it('cai pro Root do x-amzn-trace-id quando nao ha traceparent (AWS API Gateway)', () => {
    expect(resolveCorrelationId({ 'x-amzn-trace-id': AMZN })).toBe(
      '1-67891233-abcdef012345678912345678',
    );
  });

  it('traceparent tem precedencia sobre o x-amzn-trace-id', () => {
    expect(
      resolveCorrelationId({ traceparent: TRACEPARENT, 'x-amzn-trace-id': AMZN }),
    ).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
  });

  it('gera um UUID v4 quando nenhuma fonte esta disponivel', () => {
    expect(resolveCorrelationId({})).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('usa o primeiro valor quando o header vem duplicado (array)', () => {
    expect(resolveCorrelationId({ 'x-correlation-id': ['cid-a', 'cid-b'] })).toBe(
      'cid-a',
    );
  });
});

describe('extractTraceIdFromTraceparent', () => {
  it('extrai o trace-id de um header valido', () => {
    expect(
      extractTraceIdFromTraceparent(
        '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      ),
    ).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
  });

  it('retorna undefined para header ausente', () => {
    expect(extractTraceIdFromTraceparent(undefined)).toBeUndefined();
  });

  it('retorna undefined para header mal formado', () => {
    expect(extractTraceIdFromTraceparent('nao-e-um-traceparent')).toBeUndefined();
  });
});

describe('extractTraceIdFromAmznTraceId', () => {
  it('extrai o campo Root de um header valido', () => {
    expect(extractTraceIdFromAmznTraceId(AMZN)).toBe(
      '1-67891233-abcdef012345678912345678',
    );
  });

  it('retorna undefined para header ausente', () => {
    expect(extractTraceIdFromAmznTraceId(undefined)).toBeUndefined();
  });

  it('retorna undefined quando nao ha campo Root', () => {
    expect(
      extractTraceIdFromAmznTraceId('Self=1-67891233-12456;Sampled=1'),
    ).toBeUndefined();
  });
});

describe('resolveUpstreamTraceId', () => {
  it('prioriza o traceparent (W3C)', () => {
    expect(
      resolveUpstreamTraceId({
        traceparent: TRACEPARENT,
        'x-datadog-trace-id': '123456789',
        'x-amzn-trace-id': AMZN,
      }),
    ).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
  });

  it('usa x-datadog-trace-id quando nao ha traceparent', () => {
    expect(
      resolveUpstreamTraceId({ 'x-datadog-trace-id': '123456789', 'x-amzn-trace-id': AMZN }),
    ).toBe('123456789');
  });

  it('ignora x-datadog-trace-id nao numerico', () => {
    expect(
      resolveUpstreamTraceId({ 'x-datadog-trace-id': 'nao-numerico', 'x-amzn-trace-id': AMZN }),
    ).toBe('1-67891233-abcdef012345678912345678');
  });

  it('cai pro Root do x-amzn-trace-id por ultimo', () => {
    expect(resolveUpstreamTraceId({ 'x-amzn-trace-id': AMZN })).toBe(
      '1-67891233-abcdef012345678912345678',
    );
  });

  it('retorna undefined quando nenhum header de trace esta presente', () => {
    expect(resolveUpstreamTraceId({})).toBeUndefined();
  });
});
