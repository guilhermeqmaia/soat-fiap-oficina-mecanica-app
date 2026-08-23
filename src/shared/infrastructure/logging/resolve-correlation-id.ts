import { randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';

const TRACEPARENT_RE =
  /^[0-9a-f]{2}-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}$/i;

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
 * trace-id do `traceparent` (W3C Trace Context) -> gera um UUID v4 novo.
 */
export function resolveCorrelationId(headers: IncomingHttpHeaders): string {
  return (
    headerValue(headers, 'x-correlation-id') ||
    headerValue(headers, 'x-request-id') ||
    extractTraceIdFromTraceparent(headerValue(headers, 'traceparent')) ||
    randomUUID()
  );
}
