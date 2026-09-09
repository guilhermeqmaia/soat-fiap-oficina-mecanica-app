// Helpers compartilhados da suite de performance (US-F2-11):
// autenticacao (setup), requests tageadas (read/write), sanidade anti-429 e
// geracao de relatorios (JSON + HTML) via handleSummary.

import http from 'k6/http';
import crypto from 'k6/crypto';
import encoding from 'k6/encoding';
import { check, fail } from 'k6';
import { Counter } from 'k6/metrics';
import {
  BASE_URL,
  JWT_SECRET,
  JWT_ISSUER,
  AUTH_SUB,
  AUTH_ROLE,
  THROTTLE_PROBE_PATH,
  SEED_CLIENTE_ID,
  SEED_VEICULO_ID,
  OUT_DIR,
} from './config.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Conta respostas 429 (rate limit). Nos cenarios de perf deve ser sempre 0.
export const throttled429 = new Counter('throttled_429');

function track429(res) {
  if (res.status === 429) throttled429.add(1);
  return res;
}

function authHeaders(token) {
  return token ? { ...JSON_HEADERS, Authorization: `Bearer ${token}` } : JSON_HEADERS;
}

const b64url = (value) => encoding.b64encode(value, 'rawurl');

/**
 * setup(): emite UMA vez o JWT que os VUs reutilizam.
 *
 * Resource server (US-F3-03): a app so VALIDA tokens (assinatura HS256, `iss`
 * e `exp`) — quem emite e a Lambda de CPF. Assinar aqui, com o mesmo segredo
 * da app-alvo, mantem a suite de carga medindo a APLICACAO, sem depender do
 * gateway/Lambda nem de dado semeado de usuario.
 */
export function login() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      sub: AUTH_SUB,
      nome: 'Perf Runner',
      role: AUTH_ROLE,
      iss: JWT_ISSUER,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = crypto.hmac(
    'sha256',
    JWT_SECRET,
    `${header}.${payload}`,
    'base64rawurl',
  );
  const token = `${header}.${payload}.${signature}`;

  // Falha cedo (e com mensagem clara) se o segredo/issuer nao casar com a app.
  const probe = http.get(`${BASE_URL}/ordens-servico?limit=1`, {
    headers: { ...JSON_HEADERS, Authorization: `Bearer ${token}` },
    tags: { name: 'setup:token-probe' },
  });
  if (probe.status === 401) {
    fail(
      `Token rejeitado pela app-alvo (401). Confira JWT_SECRET/JWT_ISSUER do k6 ` +
        `(-e JWT_SECRET=...) contra os da app-alvo — US-F3-03.`,
    );
  }
  return token;
}

/**
 * Sanidade anti-contaminacao: garante que o throttler esta DESATIVADO antes de
 * medir performance. A rota publica de status de OS tem limite proprio
 * (30/60s); com o throttler ATIVO uma rajada curta retorna 429, com
 * THROTTLER_DISABLED=true nao retorna nenhum. Se aparecer 429 aqui, os numeros
 * estariam contaminados -> aborta.
 * (Ate a US-F3-03 o alvo era `/auth/login`, que saiu do monolito.)
 */
export function assertThrottlerDisabled() {
  const burst = 40;
  let seen429 = 0;
  for (let i = 0; i < burst; i++) {
    const res = http.get(`${BASE_URL}${THROTTLE_PROBE_PATH}`, {
      tags: { name: 'setup:sanity-throttler' },
    });
    if (res.status === 429) seen429++;
  }
  if (seen429 > 0) {
    fail(
      `Sanidade anti-429 falhou: ${seen429}/${burst} respostas 429 em ` +
        `${THROTTLE_PROBE_PATH}. O throttler ainda esta ATIVO — suba a app-alvo ` +
        `com THROTTLER_DISABLED=true antes de medir performance.`,
    );
  }
}

/** GET /health (publico, sem throttle) — alvo neutro para baseline/spike/soak. */
export function getHealth() {
  const res = http.get(`${BASE_URL}/health`, {
    tags: { kind: 'read', name: 'GET /health' },
  });
  check(res, { 'health 200': (r) => r.status === 200 });
  return track429(res);
}

/** GET /ordens-servico (autenticado; throttled 100/60s no default). */
export function listOrdens(token) {
  const res = http.get(`${BASE_URL}/ordens-servico`, {
    headers: authHeaders(token),
    tags: { kind: 'read', name: 'GET /ordens-servico' },
  });
  check(res, { 'ordens 200': (r) => r.status === 200 });
  return track429(res);
}

/** POST /ordens-servico (autenticado) — cria OS com dados de seed. */
export function createOrdem(token) {
  const body = JSON.stringify({
    clienteId: SEED_CLIENTE_ID,
    veiculoId: SEED_VEICULO_ID,
    descricaoInicial: 'Teste de carga US-F2-11 — cliente relata ruido ao frear',
  });
  const res = http.post(`${BASE_URL}/ordens-servico`, body, {
    headers: authHeaders(token),
    tags: { kind: 'write', name: 'POST /ordens-servico' },
  });
  check(res, { 'cria OS 2xx': (r) => r.status >= 200 && r.status < 300 });
  return track429(res);
}

// ---------------------------------------------------------------------------
// Relatorios (handleSummary): JSON machine-readable + HTML + resumo no stdout.
// ---------------------------------------------------------------------------

function metricValue(metrics, name, key) {
  const m = metrics[name];
  return m && m.values && m.values[key] != null ? m.values[key] : null;
}

function round(v) {
  return v == null ? null : Math.round(v * 100) / 100;
}

function pct(v) {
  return v == null ? 'n/a' : `${Math.round(v * 10000) / 100}%`;
}

function fmt(v, unit = '') {
  return v == null ? 'n/a' : `${round(v)}${unit}`;
}

function esc(s) {
  return String(s).replace(
    /[&<>]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c],
  );
}

function failedThresholds(metrics) {
  return Object.entries(metrics)
    .filter(
      ([, v]) =>
        v.thresholds &&
        Object.values(v.thresholds).some((t) => t.ok === false),
    )
    .map(([k]) => k);
}

function renderHtml(s) {
  const rows = [
    ['Requests', s.requests],
    ['Req/s', round(s.reqPerSec)],
    ['Error rate', pct(s.errorRate)],
    ['429 (throttled)', s.throttled429],
    ['Read p95 (ms)', round(s.latency.read_p95)],
    ['Read p99 (ms)', round(s.latency.read_p99)],
    ['Write p95 (ms)', round(s.latency.write_p95)],
    ['Write p99 (ms)', round(s.latency.write_p99)],
  ]
    .map(
      ([k, v]) =>
        `<tr><th>${esc(k)}</th><td>${esc(v == null ? 'n/a' : v)}</td></tr>`,
    )
    .join('');
  const failed = s.thresholdsFailed.length;
  const status = failed
    ? `FALHOU: ${s.thresholdsFailed.join(', ')}`
    : 'OK';
  return `<!doctype html><html lang="pt-br"><head><meta charset="utf-8">
<title>Perf — ${esc(s.test)}</title>
<style>body{font-family:system-ui,sans-serif;margin:2rem;color:#111}
table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:.4rem .8rem;text-align:left}
.ok{color:#0a7d29}.fail{color:#c02626}code{background:#f2f2f2;padding:.1rem .3rem;border-radius:3px}</style>
</head><body>
<h1>Performance — ${esc(s.test)}</h1>
<p>Base URL: <code>${esc(s.baseUrl)}</code></p>
<p>Thresholds: <strong class="${failed ? 'fail' : 'ok'}">${esc(status)}</strong></p>
<table>${rows}</table>
<p style="margin-top:1rem;color:#666">Gerado pela suite de performance US-F2-11.</p>
</body></html>`;
}

/**
 * Constroi os artefatos de saida a partir do objeto `data` do handleSummary.
 * Retorna o mapa { caminho: conteudo } que o k6 grava; inclui `stdout` com um
 * resumo legivel. Escreve `<OUT_DIR>/<testName>-summary.{json,html}`.
 */
export function summarize(data, testName) {
  const metrics = data.metrics || {};
  const s = {
    test: testName,
    baseUrl: BASE_URL,
    iterations: metricValue(metrics, 'iterations', 'count'),
    requests: metricValue(metrics, 'http_reqs', 'count'),
    reqPerSec: metricValue(metrics, 'http_reqs', 'rate'),
    // Taxa de erro das requests da app (reads/writes); exclui setup/sanidade.
    // Cai para a global se nao houver requests tageadas (ex: cenario anti-DoS).
    errorRate:
      metricValue(metrics, 'http_req_failed{kind:read}', 'rate') ??
      metricValue(metrics, 'http_req_failed', 'rate'),
    errorRateAll: metricValue(metrics, 'http_req_failed', 'rate'),
    throttled429: metricValue(metrics, 'throttled_429', 'count') || 0,
    latency: {
      read_p95: metricValue(metrics, 'http_req_duration{kind:read}', 'p(95)'),
      read_p99: metricValue(metrics, 'http_req_duration{kind:read}', 'p(99)'),
      write_p95: metricValue(metrics, 'http_req_duration{kind:write}', 'p(95)'),
      write_p99: metricValue(metrics, 'http_req_duration{kind:write}', 'p(99)'),
      all_p95: metricValue(metrics, 'http_req_duration', 'p(95)'),
      all_p99: metricValue(metrics, 'http_req_duration', 'p(99)'),
    },
    thresholdsFailed: failedThresholds(metrics),
  };

  const line = '-'.repeat(64);
  const text = [
    '',
    line,
    `  Performance: ${testName}   (${BASE_URL})`,
    line,
    `  Requests:        ${fmt(s.requests)}  (${fmt(s.reqPerSec, '/s')})`,
    `  Error rate:      ${pct(s.errorRate)}`,
    `  429 (throttled): ${s.throttled429}`,
    `  Read  p95/p99:   ${fmt(s.latency.read_p95, 'ms')} / ${fmt(s.latency.read_p99, 'ms')}`,
    `  Write p95/p99:   ${fmt(s.latency.write_p95, 'ms')} / ${fmt(s.latency.write_p99, 'ms')}`,
    `  Thresholds:      ${s.thresholdsFailed.length ? 'FALHOU -> ' + s.thresholdsFailed.join(', ') : 'OK'}`,
    line,
    '',
  ].join('\n');

  const files = { stdout: text };
  files[`${OUT_DIR}/${testName}-summary.json`] = JSON.stringify(
    { summary: s, raw: data },
    null,
    2,
  );
  files[`${OUT_DIR}/${testName}-summary.html`] = renderHtml(s);
  return files;
}
