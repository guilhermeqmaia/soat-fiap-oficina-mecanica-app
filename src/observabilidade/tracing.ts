/**
 * APM/tracing (US-F3-10) — inicializado ANTES de qualquer import do Nest, pois
 * o dd-trace precisa instrumentar os modulos no momento em que sao carregados.
 *
 * Opcional por design: sem `DD_TRACE_ENABLED=true` nada e carregado, entao a
 * app roda igual em dev/CI e nos ambientes sem Datadog. A alternativa OSS
 * (OpenTelemetry -> Prometheus/Grafana, ADR-0004) entra no mesmo ponto.
 */
export function iniciarTracing(): void {
  if (process.env.DD_TRACE_ENABLED !== 'true') return;

  // require dinamico: a dependencia so e resolvida quando o tracing esta ligado
  // (mantem a imagem e o cold start enxutos quando nao ha APM).
   
  const tracer = require('dd-trace');
  tracer.init({
    service: process.env.DD_SERVICE ?? 'oficina-mecanica-app',
    env: process.env.DD_ENV ?? process.env.NODE_ENV ?? 'development',
    version: process.env.DD_VERSION,
    // Injeta trace_id/span_id nos logs -> correlacao trace <-> log exigida
    // pela story (US-F3-09 emite os logs em JSON).
    logInjection: true,
    runtimeMetrics: true,
  });
}
