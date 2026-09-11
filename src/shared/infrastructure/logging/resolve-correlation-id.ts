import { randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';

const TRACEPARENT_RE =
  /^[0-9a-f]{2}-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}$/i;

/** Campo `Root=` do header `X-Amzn-Trace-Id` (AWS ALB / API Gateway). */
const AMZN_ROOT_RE = /Root=([0-9A-Za-z._-]+)/;

/** `x-datadog-trace-id` e um inteiro decimal (formato de propagacao do dd). */
const DATADOG_TRACE_ID_RE = /^\d+$/;

/**
 * Extrai o trace-id (segundo campo) de um header `traceparent` no formato
 * W3C Trace Context (`00-{trace-id}-{parent-id}-{flags}`). Retorna
 * `undefined` quando o header esta ausente ou mal formado.
 */
export function extractTraceIdFromTraceparent(
  traceparent?: string,
): string | undefined {
  if (!traceparent) return undefined;
  const match = TRACEPARENT_RE.exec(traceparent.trim());
  return match?.[1];
}

/**
 * Extrai o trace-id (`Root=...`) de um header `X-Amzn-Trace-Id`, emitido pelo
 * AWS API Gateway / Application Load Balancer. Formato:
 * `Root=1-67891233-abcdef012345678912345678;Parent=...;Sampled=1`. Retorna
 * `undefined` quando ausente ou sem o campo `Root`.
 */
export function extractTraceIdFromAmznTraceId(
  header?: string,
): string | undefined {
  if (!header) return undefined;
  return AMZN_ROOT_RE.exec(header)?.[1];
}

function headerValue(
  headers: IncomingHttpHeaders,
  name: string,
): string | undefined {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Resolve o correlation ID de uma requisicao HTTP a partir dos headers
 * aceitos, na ordem de precedencia definida pela US-F3-09:
 * `x-correlation-id` -> `x-request-id` (padrao de proxies/API Gateway) ->
 * trace-id do `traceparent` (W3C) -> `Root` do `x-amzn-trace-id` (AWS) ->
 * gera um UUID v4 novo.
 */
export function resolveCorrelationId(headers: IncomingHttpHeaders): string {
  return (
    headerValue(headers, 'x-correlation-id') ||
    headerValue(headers, 'x-request-id') ||
    extractTraceIdFromTraceparent(headerValue(headers, 'traceparent')) ||
    extractTraceIdFromAmznTraceId(headerValue(headers, 'x-amzn-trace-id')) ||
    randomUUID()
  );
}

/**
 * Trace-id trazido pela borda (gateway / load balancer / servico chamador),
 * para correlacionar os logs com o trace de APM quando NAO ha um span local
 * ativo (caminho OSS / sem `dd-trace`). Precedencia:
 * `traceparent` (W3C) -> `x-datadog-trace-id` -> `Root` do `x-amzn-trace-id`.
 * Retorna `undefined` quando nenhum esta presente/valido.
 */
export function resolveUpstreamTraceId(
  headers: IncomingHttpHeaders,
): string | undefined {
  const traceparent = extractTraceIdFromTraceparent(
    headerValue(headers, 'traceparent'),
  );
  if (traceparent) return traceparent;

  const datadog = headerValue(headers, 'x-datadog-trace-id');
  if (datadog && DATADOG_TRACE_ID_RE.test(datadog)) return datadog;

  return extractTraceIdFromAmznTraceId(headerValue(headers, 'x-amzn-trace-id'));
}
