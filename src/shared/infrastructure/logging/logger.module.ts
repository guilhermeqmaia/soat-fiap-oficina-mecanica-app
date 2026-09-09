import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import type { Options } from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getCorrelationContext } from './correlation-context';
import { REDACT_PATHS } from './redact-paths';
import { resolveCorrelationId } from './resolve-correlation-id';
import { getActiveTraceIds } from '../tracing/tracer-bridge';

interface RequestWithUser extends IncomingMessage {
  correlationId?: string;
  user?: { id?: string; role?: string };
}

interface RequestWithCorrelationId extends IncomingMessage {
  correlationId?: string;
}

/** `debug` fora de producao (US-F3-09), sobrescrevivel via `LOG_LEVEL`. */
function defaultLevel(nodeEnv: string): string {
  return nodeEnv === 'production' ? 'info' : 'debug';
}

export function buildPinoHttpOptions(config: ConfigService): Options {
  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  const isTest = nodeEnv === 'test';

  return {
    level: isTest
      ? 'silent'
      : config.get<string>('LOG_LEVEL', defaultLevel(nodeEnv)),
    autoLogging: !isTest,
    // Le `req.correlationId` primeiro para o caso de `CorrelationIdMiddleware`
    // (aplicado via `AppModule.configure`) ja ter rodado antes deste
    // middleware na cadeia — mantem um unico ID mesmo com ordem invertida
    // entre os dois, sem depender de qual dos dois roda primeiro.
    genReqId: (req: RequestWithCorrelationId) =>
      req.correlationId || resolveCorrelationId(req.headers),
    // Todo log emitido durante uma requisicao (incluindo `new Logger().log()`
    // em services/listeners fora do pino-http) herda correlationId/traceId
    // do AsyncLocalStorage — nao apenas a linha automatica de request/response.
    //
    // Com APM ativo (`dd-trace`), o `traceId` vem do span REAL do tracer e os
    // campos `dd.trace_id`/`dd.span_id` (formato que o pipeline do Datadog
    // casa automaticamente com o trace) sao emitidos aqui — em vez de delegar
    // ao `logInjection` do dd-trace, que dependeria dele conseguir dar patch
    // no pino instanciado pelo nestjs-pino. Uma unica fonte de verdade.
    mixin() {
      const ctx = getCorrelationContext();
      if (!ctx) return {};

      const active = getActiveTraceIds();
      if (!active) {
        return { correlationId: ctx.correlationId, traceId: ctx.traceId };
      }

      return {
        correlationId: ctx.correlationId,
        traceId: active.traceId,
        dd: { trace_id: active.traceId, span_id: active.spanId },
      };
    },
    // Campos padrao da US-F3-09 (method/path/statusCode/userId/role) em vez
    // dos objetos `req`/`res` verbosos default do pino-http. Usa
    // customSuccessObject/customErrorObject (chamados uma unica vez, na
    // conclusao da requisicao, com o statusCode final) em vez de
    // `customProps` — este ultimo tambem eh avaliado no INICIO da
    // requisicao (statusCode ainda default) e, como pino-http nao decupa
    // bindings quando o valor muda, cada chave apareceria duplicada no JSON.
    customSuccessObject: (req: RequestWithUser, res: ServerResponse, val: object) => ({
      ...val,
      method: req.method,
      path: req.url,
      statusCode: res.statusCode,
      userId: req.user?.id,
      role: req.user?.role,
    }),
    customErrorObject: (req: RequestWithUser, res: ServerResponse, _err: Error, val: object) => ({
      ...val,
      method: req.method,
      path: req.url,
      statusCode: res.statusCode,
      userId: req.user?.id,
      role: req.user?.role,
    }),
    serializers: {
      req: () => undefined,
      res: () => undefined,
    },
    customAttributeKeys: {
      reqId: 'correlationId',
      responseTime: 'latencyMs',
    },
    customSuccessMessage: (req: IncomingMessage, res: ServerResponse) =>
      `${req.method} ${req.url} -> ${res.statusCode}`,
    customErrorMessage: (req: IncomingMessage, res: ServerResponse, err: Error) =>
      `${req.method} ${req.url} -> ${res.statusCode} (${err.message})`,
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
  };
}

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: buildPinoHttpOptions(config),
      }),
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
