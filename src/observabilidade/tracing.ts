import { registrarTracer } from '../shared/infrastructure/tracing/tracer-bridge';

/**
 * APM/tracing (US-F3-10) — inicializado ANTES de qualquer import do Nest, pois
 * o dd-trace precisa instrumentar os modulos no momento em que sao carregados.
 *
 * Opcional por design: sem `DD_TRACE_ENABLED=true` nada e carregado, entao a
 * app roda igual em dev/CI e nos ambientes sem Datadog. A alternativa OSS
 * (OpenTelemetry -> Prometheus/Grafana, ADR-0004) entra no mesmo ponto.
 *
 * Resiliente por design: se o pacote nao estiver instalado ou `init` falhar,
 * a app segue SEM tracing (os logs continuam com `correlationId`/`traceId`
 * pelo fallback do `correlation-id.middleware`) em vez de nao subir.
 */
export function iniciarTracing(): void {
  if (process.env.DD_TRACE_ENABLED !== 'true') return;

  try {
    // require dinamico: a dependencia so e resolvida quando o tracing esta
    // ligado (mantem a imagem e o cold start enxutos quando nao ha APM).

    const tracer = require('dd-trace');
    tracer.init({
      service: process.env.DD_SERVICE ?? 'oficina-mecanica-app',
      env: process.env.DD_ENV ?? process.env.NODE_ENV ?? 'development',
      version: process.env.DD_VERSION,
      // A correlacao trace <-> log e feita no `mixin` do pino
      // (logger.module.ts), que le o span ativo via `tracer-bridge`. Desligado
      // aqui para nao duplicar os campos `dd.*` no JSON.
      logInjection: false,
      runtimeMetrics: true,
    });
    registrarTracer(tracer);
  } catch (err) {
    process.stderr.write(
      `[tracing] APM desabilitado (${(err as Error).message}); seguindo sem tracing.\n`,
    );
  }
}
