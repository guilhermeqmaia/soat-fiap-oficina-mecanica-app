import {
  getCorrelationContext,
  getCorrelationId,
  runWithCorrelation,
} from './correlation-context';

describe('correlation-context', () => {
  it('nao ha contexto fora de runWithCorrelation', () => {
    expect(getCorrelationContext()).toBeUndefined();
    expect(getCorrelationId()).toBeUndefined();
  });

  it('expoe o contexto dentro de runWithCorrelation', () => {
    runWithCorrelation({ correlationId: 'cid-1', traceId: 'trace-1' }, () => {
      expect(getCorrelationContext()).toEqual({
        correlationId: 'cid-1',
        traceId: 'trace-1',
      });
      expect(getCorrelationId()).toBe('cid-1');
    });
  });

  it('propaga o contexto atraves de awaits assincronos', async () => {
    await runWithCorrelation({ correlationId: 'cid-async', traceId: 't' }, async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(getCorrelationId()).toBe('cid-async');
    });
  });

  it('isola contextos de execucoes concorrentes', async () => {
    const results: string[] = [];
    await Promise.all([
      runWithCorrelation({ correlationId: 'a', traceId: 'a' }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(getCorrelationId()!);
      }),
      runWithCorrelation({ correlationId: 'b', traceId: 'b' }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        results.push(getCorrelationId()!);
      }),
    ]);
    expect(results.sort()).toEqual(['a', 'b']);
  });
});
