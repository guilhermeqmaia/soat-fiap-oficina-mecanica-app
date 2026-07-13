# Testes de Performance e Escalabilidade (US-F2-11)

Suite de carga/estresse/pico/soak/escalabilidade em [k6](https://k6.io), isolada
do Jest. **Roda sob demanda, contra a app HTTP real** (não in-process) e **não
conta para o gate de 80% de cobertura** (é JS fora de `src/`, não é um projeto
Jest).

Ver a User Story completa em
[`docs/user-stories/f2-11-testes-carga-escalabilidade.md`](../docs/user-stories/f2-11-testes-carga-escalabilidade.md).

## Pré-requisitos

- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) no PATH
  (`brew install k6`, `choco install k6`, ou pacote apt/yum).
- A app-alvo no ar **com o throttler desligado** (ver abaixo).
- Para o teste de HPA: cluster `kind` + `kubectl` + `metrics-server`.

## O throttler (rate limiting) — leia antes de medir

A app tem um rate limit global (`@nestjs/throttler`, 100 req/60s, com `/auth/login`
a 5/60s). Se você martelar a API com o throttler **ligado**, o k6 mede os HTTP
429 do throttler, **não** a app. Por isso os cenários de performance exigem a app
subida com `THROTTLER_DISABLED=true` (hook em
[`src/config/throttler.config.ts`](../src/config/throttler.config.ts)).

Todo cenário de performance roda um **passo de sanidade anti-429** no `setup()`:
uma rajada em `/auth/login` que **falha o teste** se aparecer qualquer 429 (sinal
de que o throttler ficou ligado e os números estariam contaminados).

> Exceção: `perf/throttler.js` é o teste **anti-DoS** do próprio throttler — esse
> roda com o throttler **LIGADO** e exige que o 429 dispare.

## Subindo a app-alvo localmente

```bash
# Throttler desligado (para cenários de performance) + docker compose
THROTTLER_DISABLED=true JWT_SECRET=dev-secret docker compose up -d --build postgres app

# Semear usuários/dados de teste (necessário para os cenários autenticados)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/oficina_mecanica?schema=public" npm run seed
```

A app fica em `http://localhost:3000`.

## Rodando os testes

```bash
npm run perf:smoke       # sanidade rápida (poucos VUs, 30s) — rode primeiro
npm run perf:load        # carga sustentada nominal (SLO gate, aborta em regressão)
npm run perf:stress      # acha o joelho/ponto de ruptura (gate de regressão no baseline)
npm run perf:spike       # pico súbito e recuperação
npm run perf:soak        # 20min — detecta memory leak / degradação
npm run perf:throttler   # anti-DoS: exige que o rate limit dispare (throttler LIGADO)
npm run perf:hpa         # escalabilidade: assert de scale-up/down do HPA (precisa de kind)
```

Ou direto com overrides via `-e`:

```bash
k6 run perf/load.js -e BASE_URL=http://localhost:3000 -e VUS=40 -e DURATION=3m -e PERF_WRITE=1
```

### Variáveis de ambiente

| Env | Default | Usado por |
|---|---|---|
| `BASE_URL` | `http://localhost:3000` | todos |
| `VUS` | por script | smoke/load/soak |
| `DURATION` | por script | todos |
| `PERF_WRITE` | `0` | load (habilita `POST /ordens-servico`) |
| `AUTH_EMAIL` / `AUTH_SENHA` | `atendente@oficina.com` / `atendente123` | cenários autenticados |
| `CLIENTE_ID` / `VEICULO_ID` | IDs de seed | cenário de escrita |
| `STRESS_MIN_VUS` / `STRESS_MAX_VUS` | `15` / `200` | stress |
| `SPIKE_VUS` | `200` | spike |
| `PERF_OUT_DIR` | `perf-results` | relatórios |

## SLOs (thresholds versionados como código)

Definidos em [`perf/lib/config.js`](lib/config.js). Violar um threshold faz o k6
sair com **exit code ≠ 0** (reprova o teste/CI).

```
http_req_failed                    rate < 1%   (429 conta como falha)
http_req_duration{kind:read}       p95 < 500ms  / p99 < 1000ms
http_req_duration{kind:write}      p95 < 800ms  / p99 < 1500ms
throttled_429                      count == 0   (nenhum 429 nos cenários de perf)
```

São propositalmente **frouxos para MVP** — aperte iterativamente.

## Escalabilidade / HPA (kind)

O HPA por CPU precisa do `metrics-server`; no `kind` ele **não** vem instalado e
exige `--kubelet-insecure-tls`.

```bash
# 1. Suba o cluster + app + HPA. Atalho: `bash scripts/local-k8s-up.sh` sobe tudo
#    (cluster kind, imagens, k8s apply -k, migrations, seeds E o metrics-server).
#    Manual: os manifestos ficam em `k8s/` (app/deployment.yaml, app/hpa.yaml);
#    ver tambem .github/workflows/perf-test.yml job hpa-scale para um exemplo de CI.
# 2. Instale o metrics-server e aguarde o HPA sair de <unknown>
#    (ja incluso no local-k8s-up.sh; rode o passo abaixo so no fluxo manual)
K8S_NAMESPACE=oficina K8S_HPA=oficina-app bash perf/scripts/install-metrics-server.sh

# 3. Port-forward e rode o teste de escalabilidade
kubectl port-forward -n oficina svc/oficina-app 8080:3000 &
BASE_URL=http://localhost:8080 K8S_NAMESPACE=oficina K8S_DEPLOYMENT=oficina-app K8S_HPA=oficina-app \
  HPA_MIN_SCALE=2 bash perf/scripts/hpa-scale-test.sh
```

O script gera carga, faz **assert de scale-up** (`replicas >= HPA_MIN_SCALE` dentro
de `HPA_SCALEUP_TIMEOUT`s) e observa o **scale-down** de volta ao mínimo
(`HPA_SCALEDOWN_STRICT=1` para falhar se não voltar). Durante a escala a app deve
seguir saudável — o `hpa.js` mantém os thresholds de erro/latência ("sem falhar").

> **CI vs. real:** no runner do GitHub Actions (kind single-node, ~2 vCPU) o teste
> prova o **mecanismo** do HPA (reage à carga e cria réplicas), não a capacidade de
> 10 réplicas. O `max=10` fica como validação local/manual para o vídeo. O job de CI
> usa `min=1/max=4` adaptado ao runner; o canônico da US-F2-05 é `min=2/max=10`.

## CI

**Nunca roda no push/PR padrão** (para não deixar o `ci-cd.yml`, alvo <10min,
lento). São três workflows:

| Workflow | Gatilho | O que roda |
|---|---|---|
| [`perf-run.yml`](../.github/workflows/perf-run.yml) | `workflow_call` (reutilizável) | a lógica de execução (jobs `http-perf` e `hpa-scale`) |
| [`perf-test.yml`](../.github/workflows/perf-test.yml) | `workflow_dispatch` (manual) | escolhe `test_type` (`smoke`…`hpa`), `duration`, `vus`, `write` |
| [`perf-nightly.yml`](../.github/workflows/perf-nightly.yml) | `schedule` 04:00 UTC | regressão noturna: `smoke` + `load` (2min) |

Relatórios (`*-summary.json`, `*-summary.html`, logs do HPA) sobem como artefato
e um resumo é escrito no job summary. Falha de SLO reprova o run.

> O teste de HPA só roda no disparo **manual** (`test_type: hpa`) — o noturno faz
> apenas smoke + load para não criar cluster kind toda madrugada.

## Relatórios

Cada run grava em `perf-results/`:

- `<tipo>-summary.json` — resumo + dados brutos (machine-readable);
- `<tipo>-summary.html` — tabela legível;
- (HPA) `hpa-evidence.log`, `hpa-k6.log` — evidência de scale-up/down para o vídeo.
