// Teste anti-DoS do PROPRIO throttler — cenario dedicado e SEPARADO dos SLOs de
// performance. Rodar com o throttler ATIVO (SEM THROTTLER_DISABLED): abusa da
// rota PUBLICA de status de OS (limite proprio 30/60s) e exige que o rate limit
// dispare (429).
//
// Este e o UNICO cenario que espera/tolera 429. Usa um numero de OS
// inexistente: as requests que passam o rate limit retornam 404 (nao 4xx de
// validacao) e, ao estourar o limite, 429.
//
// Ate a US-F3-03 o alvo era `POST /auth/login` (limite 5/60s), removido do
// monolito quando a app virou resource server.
//
//   k6 run perf/throttler.js -e BASE_URL=http://localhost:3000
import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, THROTTLE_PROBE_PATH } from './lib/config.js';
import { throttled429, summarize } from './lib/helpers.js';

export const options = {
  scenarios: {
    abuse: {
      executor: 'shared-iterations',
      vus: 5,
      iterations: Number(__ENV.ITERATIONS || 60),
      maxDuration: '30s',
    },
  },
  thresholds: {
    // Prova anti-DoS: o rate limit DEVE disparar ao menos uma vez.
    throttled_429: ['count>0'],
    // A app so pode responder 404 (OS inexistente) ou 429 — nunca 5xx.
    checks: ['rate>0.99'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}${THROTTLE_PROBE_PATH}`, {
    tags: { name: 'abuse:status-os' },
  });
  if (res.status === 429) throttled429.add(1);
  check(res, {
    'status 404 ou 429 (nunca 5xx)': (r) => r.status === 404 || r.status === 429,
  });
}

export function handleSummary(data) {
  return summarize(data, 'throttler');
}
