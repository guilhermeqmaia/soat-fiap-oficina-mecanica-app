/**
 * Nome deste servico nos logs (`service`), nas metricas (label `service`) e
 * no APM (`DD_SERVICE`). Na Fase 4 o monolito evolui para o OS Service
 * (US-F4-06); ate la mantem o nome da Fase 3 para os dashboards existentes.
 */
export const SERVICE_NAME = process.env.DD_SERVICE ?? 'oficina-mecanica-app';
