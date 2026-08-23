import {
  extractTraceIdFromTraceparent,
  resolveCorrelationId,
} from './resolve-correlation-id';

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
