import type { ExecutionContext } from '@nestjs/common';

/**
 * Configuracao central do rate limiting (@nestjs/throttler).
 *
 * O throttler protege contra brute-force/DoS em producao, mas atrapalha:
 *  - os testes automatizados (jest) — 429 introduz flakiness nos e2e;
 *  - os testes de carga/performance (US-F2-11) — sem desativa-lo, o k6 mede os
 *    HTTP 429 do throttler em vez da latencia/throughput reais da aplicacao.
 *
 * Por isso o "skip" e controlado por ambiente, com um hook DEDICADO para
 * performance (`THROTTLER_DISABLED`) separado da semantica de teste
 * (`NODE_ENV=test` / `JEST_WORKER_ID`), para nao acoplar as duas intencoes:
 * a app-alvo dos testes de carga sobe com `THROTTLER_DISABLED=true`, enquanto
 * `NODE_ENV`/`JEST_WORKER_ID` continuam cobrindo o jest.
 */

/** Janela de contagem do rate limit, em milissegundos. */
export const THROTTLER_TTL_MS = 60_000;

/** Numero maximo de requests por janela (limite global padrao). */
export const THROTTLER_LIMIT = 100;

/**
 * Decide se o rate limiting deve ser ignorado para esta execucao.
 *
 * Retorna `true` quando:
 *  - `THROTTLER_DISABLED === 'true'` — hook dedicado aos testes de carga
 *    (ver `docs/user-stories/f2-11-testes-carga-escalabilidade.md`);
 *  - `NODE_ENV === 'test'` ou `JEST_WORKER_ID` presente — evita 429 flaky nos
 *    testes e2e/integration do jest.
 *
 * `env` e injetavel para tornar a decisao testavel sem mexer em `process.env`.
 */
export function shouldSkipThrottling(
  env: NodeJS.ProcessEnv = process.env,
  context?: ExecutionContext,
): boolean {
  return (
    env.THROTTLER_DISABLED === 'true' ||
    env.NODE_ENV === 'test' ||
    !!env.JEST_WORKER_ID ||
    isRotaDeInfra(context)
  );
}

/** Prefixos consumidos pelo cluster (probes/scrape), nunca por usuarios. */
const ROTAS_DE_INFRA = ['/health', '/metrics'];

/**
 * `/health` e `/metrics` vem do kit (sem `@SkipThrottle`), entao a excecao e
 * feita aqui, por caminho — probes do Kubernetes e o scrape do agente nao
 * podem receber 429.
 */
export function isRotaDeInfra(context?: ExecutionContext): boolean {
  if (!context || context.getType() !== 'http') return false;
  const path: string | undefined = context.switchToHttp().getRequest()?.path;
  return !!path && ROTAS_DE_INFRA.some((p) => path === p || path.startsWith(`${p}/`));
}
