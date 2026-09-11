import {
  getActiveTraceIds,
  registrarTracer,
  resetTracerBridge,
  tagActiveSpan,
} from './tracer-bridge';

/** Fake minimo com a superficie de `dd-trace` que a ponte consome. */
function fakeTracer(span: unknown) {
  return { scope: () => ({ active: () => span }) } as never;
}

function fakeSpan(traceId: string, spanId: string) {
  return {
    setTag: jest.fn(),
    context: () => ({ toTraceId: () => traceId, toSpanId: () => spanId }),
  };
}

afterEach(() => resetTracerBridge());

describe('tracer-bridge', () => {
  describe('sem tracer registrado', () => {
    it('getActiveTraceIds retorna undefined', () => {
      expect(getActiveTraceIds()).toBeUndefined();
    });

    it('tagActiveSpan e no-op (nao lanca)', () => {
      expect(() => tagActiveSpan({ correlation_id: 'cid' })).not.toThrow();
    });
  });

  describe('com tracer registrado', () => {
    it('getActiveTraceIds devolve trace/span do span ativo', () => {
      registrarTracer(fakeTracer(fakeSpan('trace-abc', 'span-xyz')));
      expect(getActiveTraceIds()).toEqual({
        traceId: 'trace-abc',
        spanId: 'span-xyz',
      });
    });

    it('getActiveTraceIds retorna undefined quando nao ha span ativo', () => {
      registrarTracer(fakeTracer(null));
      expect(getActiveTraceIds()).toBeUndefined();
    });

    it('trata traceId "0" (span noop) como ausencia de trace', () => {
      registrarTracer(fakeTracer(fakeSpan('0', '0')));
      expect(getActiveTraceIds()).toBeUndefined();
    });

    it('tagActiveSpan grava as tags no span, ignorando valores undefined', () => {
      const span = fakeSpan('t', 's');
      registrarTracer(fakeTracer(span));

      tagActiveSpan({ correlation_id: 'cid-1', ausente: undefined });

      expect(span.setTag).toHaveBeenCalledWith('correlation_id', 'cid-1');
      expect(span.setTag).toHaveBeenCalledTimes(1);
    });
  });

  it('resetTracerBridge remove o tracer registrado', () => {
    registrarTracer(fakeTracer(fakeSpan('t', 's')));
    resetTracerBridge();
    expect(getActiveTraceIds()).toBeUndefined();
  });
});
