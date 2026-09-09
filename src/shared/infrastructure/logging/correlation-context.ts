import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto de correlacao propagado via AsyncLocalStorage durante o
 * processamento de uma requisicao. Fica disponivel para qualquer codigo
 * executado dentro do mesmo fluxo assincrono (services, listeners de
 * eventos de dominio, adapters outbound) sem precisar passar o
 * correlationId explicitamente por parametro em cada camada.
 */
export interface CorrelationContext {
  readonly correlationId: string;
  readonly traceId: string;
}

const storage = new AsyncLocalStorage<CorrelationContext>();

export function runWithCorrelation<T>(
  context: CorrelationContext,
  fn: () => T,
): T {
  return storage.run(context, fn);
}

export function getCorrelationContext(): CorrelationContext | undefined {
  return storage.getStore();
}

export function getCorrelationId(): string | undefined {
  return storage.getStore()?.correlationId;
}
