import { correlationIdMiddleware } from './correlation-id.middleware';
import { getCorrelationContext } from './logging/correlation-context';

describe('correlationIdMiddleware', () => {
  it('gera um UUID quando nenhum header de correlacao vem', () => {
    const req: any = { headers: {}, method: 'GET', url: '/x' };
    const res: any = { setHeader: jest.fn() };
    const next = jest.fn();

    correlationIdMiddleware(req, res, next);

    expect(req.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', req.correlationId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('preserva x-correlation-id quando vem do cliente', () => {
    const incoming = 'incoming-cid-123';
    const req: any = { headers: { 'x-correlation-id': incoming }, method: 'POST', url: '/y' };
    const res: any = { setHeader: jest.fn() };
    const next = jest.fn();

    correlationIdMiddleware(req, res, next);

    expect(req.correlationId).toBe(incoming);
    expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', incoming);
  });

  it('cai pro x-request-id quando nao tem x-correlation-id', () => {
    const req: any = { headers: { 'x-request-id': 'lb-id-456' }, method: 'GET', url: '/z' };
    const res: any = { setHeader: jest.fn() };
    const next = jest.fn();

    correlationIdMiddleware(req, res, next);

    expect(req.correlationId).toBe('lb-id-456');
  });

  it('reaproveita req.id ja resolvido pelo pino-http (genReqId)', () => {
    const req: any = { id: 'pino-req-id', headers: {}, method: 'GET', url: '/w' };
    const res: any = { setHeader: jest.fn() };
    const next = jest.fn();

    correlationIdMiddleware(req, res, next);

    expect(req.correlationId).toBe('pino-req-id');
    expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', 'pino-req-id');
  });

  it('deriva o traceId do header traceparent (W3C Trace Context)', () => {
    const traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
    const req: any = { headers: { traceparent }, method: 'GET', url: '/t' };
    const res: any = { setHeader: jest.fn() };
    let observedTraceId: string | undefined;
    const next = jest.fn(() => {
      observedTraceId = getCorrelationContext()?.traceId;
    });

    correlationIdMiddleware(req, res, next);

    expect(observedTraceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
  });

  it('disponibiliza correlationId/traceId via AsyncLocalStorage durante e apos next() (sincrono)', () => {
    const req: any = { headers: { 'x-correlation-id': 'cid-als' }, method: 'GET', url: '/als' };
    const res: any = { setHeader: jest.fn() };
    let observedDuring: unknown;
    const next = jest.fn(() => {
      observedDuring = getCorrelationContext();
    });

    correlationIdMiddleware(req, res, next);

    expect(observedDuring).toEqual({ correlationId: 'cid-als', traceId: 'cid-als' });
  });

  it('propaga o contexto atraves de um next() assincrono', async () => {
    const req: any = { headers: { 'x-correlation-id': 'cid-async' }, method: 'GET', url: '/async' };
    const res: any = { setHeader: jest.fn() };
    let observedAfterAwait: unknown;
    const next = jest.fn(async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
      observedAfterAwait = getCorrelationContext();
    });

    correlationIdMiddleware(req, res, next);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(observedAfterAwait).toEqual({ correlationId: 'cid-async', traceId: 'cid-async' });
  });
});
