import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

/**
 * Registry unico de metricas no formato OpenMetrics/Prometheus (US-F3-10).
 *
 * Formato deliberadamente agnostico de fornecedor: o agente do Datadog faz
 * scrape via OpenMetrics e um Prometheus/Grafana consome o mesmo endpoint
 * (ADR-0004 registra Datadog como primaria e Prometheus/Grafana como
 * alternativa OSS — os SINAIS aqui nao mudam com a escolha).
 */
export const registry = new Registry();

// CPU, memoria, event loop e GC do processo — complementam as metricas de
// pod/node coletadas pelo agente no cluster.
collectDefaultMetrics({ register: registry, prefix: 'oficina_' });

/** Latencia HTTP por rota — base dos p50/p95/p99 exigidos pela story. */
export const httpDuration = new Histogram({
  name: 'oficina_http_request_duration_seconds',
  help: 'Duracao das requisicoes HTTP por rota, metodo e status',
  labelNames: ['method', 'route', 'status'] as const,
  // Faixas escolhidas em torno dos SLOs da suite perf/ (p95 < 500ms leitura,
  // < 800ms escrita).
  buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 0.8, 1.5, 3, 5],
  registers: [registry],
});

/** Volume de OS por transicao de status — alimenta os dashboards da US-F3-11. */
export const osTransicoes = new Counter({
  name: 'oficina_os_transicoes_total',
  help: 'Transicoes de status de ordens de servico',
  labelNames: ['de', 'para'] as const,
  registers: [registry],
});

/** Tempo de permanencia em cada status (fecha quando a OS sai do status). */
export const osTempoNoStatus = new Histogram({
  name: 'oficina_os_tempo_no_status_seconds',
  help: 'Tempo que a OS permaneceu em cada status antes de transicionar',
  labelNames: ['status'] as const,
  buckets: [60, 300, 900, 3600, 14400, 86400, 259200],
  registers: [registry],
});

/**
 * Erros de integracao (notificacao/webhook) — criterio explicito da story e
 * insumo do alerta de "falha no processamento de OS" (US-F3-11).
 */
export const integracaoResultados = new Counter({
  name: 'oficina_integracoes_total',
  help: 'Resultado das integracoes externas (notificacao, webhook)',
  labelNames: ['integracao', 'resultado'] as const,
  registers: [registry],
});
