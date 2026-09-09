/**
 * Ponte entre o tracer de APM (opcional — `dd-trace`, ligado por
 * `DD_TRACE_ENABLED`) e a camada de logging/correlacao.
 *
 * Existe para ter UMA fonte de verdade para o `trace_id` que aparece nos
 * logs: quando ha APM ativo, o id vem do span REAL do tracer (o mesmo valor
 * que o backend de APM usa para casar trace <-> log); quando nao ha, quem
 * chama decide o fallback (`traceparent` do gateway, `x-amzn-trace-id`,
 * `x-datadog-trace-id`, ou o proprio `correlationId`).
 *
 * Nada aqui importa `dd-trace` estaticamente. O pacote so entra no processo
 * via `iniciarTracing()` no bootstrap, que chama `registrarTracer()`. Sem
 * isso todas as funcoes sao no-op e a app roda identica — sem o APM
 * instalado, em CI e nos testes.
 */

interface SpanContext {
  toTraceId(): string;
  toSpanId(): string;
}

interface Span {
  context(): SpanContext;
  setTag(key: string, value: unknown): void;
}

interface Tracer {
  scope(): { active(): Span | null };
}

let tracer: Tracer | undefined;

/** Registra o tracer ja inicializado. Chamado uma vez, pelo bootstrap. */
export function registrarTracer(instance: Tracer): void {
  tracer = instance;
}

/** Zera o tracer registrado. Uso restrito a testes. */
export function resetTracerBridge(): void {
  tracer = undefined;
}

export interface TraceIds {
  readonly traceId: string;
  readonly spanId: string;
}

/**
 * IDs do span de APM ativo no fluxo assincrono atual, ou `undefined` quando
 * nao ha tracer registrado / nenhum span ativo. `traceId` e estavel dentro
 * de um mesmo trace; `spanId` muda a cada span.
 */
export function getActiveTraceIds(): TraceIds | undefined {
  const span = tracer?.scope().active();
  if (!span) return undefined;

  const ctx = span.context();
  const traceId = ctx.toTraceId();
  const spanId = ctx.toSpanId();

  // `dd-trace` devolve '0' para um span noop (fora de um trace real).
  if (!traceId || traceId === '0') return undefined;

  return { traceId, spanId };
}

/**
 * Anexa tags ao span de APM ativo (no-op sem tracer / sem span ativo). Usado
 * para gravar o `correlation_id` no trace e habilitar o pivo trace -> logs
 * no APM.
 */
export function tagActiveSpan(tags: Record<string, string | undefined>): void {
  const span = tracer?.scope().active();
  if (!span) return;

  for (const [key, value] of Object.entries(tags)) {
    if (value !== undefined) span.setTag(key, value);
  }
}
