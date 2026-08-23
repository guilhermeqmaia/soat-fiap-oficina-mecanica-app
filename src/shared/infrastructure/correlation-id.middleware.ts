import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import {
  extractTraceIdFromTraceparent,
  resolveCorrelationId,
} from './logging/resolve-correlation-id';
import { runWithCorrelation } from './logging/correlation-context';

export type RequestWithCorrelation = Request & {
  id?: string;
  correlationId?: string;
};

/**
 * Middleware Express (aplicado via `app.use`, ANTES do dispatch do Nest) que
 * atribui o correlation ID da requisicao, o devolve no header de resposta e
 * o disponibiliza — via AsyncLocalStorage — para toda a cadeia assincrona da
 * requisicao (guards, controllers, services, listeners de eventos de
 * dominio, adapters outbound como o webhook de notificacao).
 *
 * Precisa ser middleware (nao interceptor): interceptors so envolvem a
 * chamada ao controller, que o Nest executa via `Promise`/`lastValueFrom`
 * fora da pilha sincrona do interceptor — o `AsyncLocalStorage` se perderia
 * antes da resposta ser enviada. Como middleware, `runWithCorrelation` envolve
 * a chamada a `next()`, entao toda a continuacao assincrona subsequente
 * (incluindo o `res.end()` que dispara o log de conclusao do pino-http)
 * herda o contexto.
 *
 * Fonte do ID (em ordem de precedencia):
 * - `req.id`, ja resolvido por `genReqId` no pino-http (registrado antes
 *   deste middleware — ver `logger.module.ts` e `main.ts`)
 * - `x-correlation-id` (custom)
 * - `x-request-id` (padrao de proxies/API Gateway)
 * - trace-id do header `traceparent` (W3C Trace Context)
 * - gera um UUID v4 novo
 *
 * O trace-id (para correlacao com APM, US-F3-10) vem do `traceparent` quando
 * presente; caso contrario usa o proprio correlationId.
 */
export function correlationIdMiddleware(
  req: RequestWithCorrelation,
  res: Response,
  next: NextFunction,
): void {
  const correlationId = req.id || resolveCorrelationId(req.headers);
  const traceId =
    extractTraceIdFromTraceparent(req.headers['traceparent'] as string) ||
    correlationId;

  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  runWithCorrelation({ correlationId, traceId }, next);
}

/**
 * Wrapper `NestMiddleware` de `correlationIdMiddleware`, aplicado via
 * `AppModule.configure()` — assim vale em qualquer bootstrap do `AppModule`
 * (app real via `main.ts` e apps de teste via `Test.createTestingModule`),
 * sem depender de cada bootstrap chamar `app.use()` manualmente.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: RequestWithCorrelation, res: Response, next: NextFunction): void {
    correlationIdMiddleware(req, res, next);
  }
}
