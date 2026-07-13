# US-F2-11: Testes de Carga, Estresse, Pico, Soak e Escalabilidade (Performance)

**User Story:** Como Engenheiro de Qualidade/DevOps, quero uma suite de testes de carga, estresse, pico, soak e escalabilidade com SLOs versionados como codigo, para **provar que o sistema aguenta um volume alto de requests e escala automaticamente via HPA sem falhar**, alem de detectar regressoes de performance antes de producao.

**Prioridade:** Media
**Story Points:** 8
**Status:** Concluída
**DDD Domain:** Infraestrutura (Qualidade/Testes)
**DDD Layer:** Infrastructure (Testes/CI)

> **Nota de implementação (concluída):** a suíte `perf/` (k6: `smoke/load/stress/spike/soak/hpa/throttler`) foi criada; o hook `THROTTLER_DISABLED` existe (`src/config/throttler.config.ts`, usado no `skipIf` de `src/app.module.ts`); os manifestos estão em `k8s/` com Deployment/Service/HPA **`oficina-app`** (namespace `oficina`, HPA CPU 70% / mem 80%, min 2 / max 10), aplicados via `kubectl apply -k k8s/` — inclusive no [`ci-cd.yml`](../../.github/workflows/ci-cd.yml). O `metrics-server` é instalado por `perf/scripts/install-metrics-server.sh` (ainda **não** pelo Terraform). Onde os critérios abaixo citam o nome `app` ou a convenção `mecanica`/`mecanica-app`, o nome real do recurso é **`oficina-app`**.

## Contexto

Hoje o projeto tem ~105 specs entre testes unitarios (`jest.unit.config.ts`) e testes de integracao/e2e com Postgres via testcontainers (`jest.integration.config.ts`), com gate de 80% de cobertura no CI. Isso valida **corretude funcional**, mas **nao existe nenhum teste de carga, performance ou escalabilidade** — nao ha diretorio nem tooling de load (nenhuma ref a `k6`/`autocannon`/`hey`/`ab` fora dos docs de plano).

A Fase 2 introduz Kubernetes com HPA por CPU 70% (min=2, max=10) e por memoria (ver [US-F2-05](f2-05-manifestos-kubernetes.md)), rodando em cluster `kind` provisionado por Terraform (`infra/terraform/`), com o job `verify-deploy` do pipeline ja subindo um kind efemero (ver [US-F2-07](f2-07-cicd-completo.md)). O proprio plano da fase (`docs/plano-execucao-fase-2.md`, Onda 7 — Testes de carga e escalabilidade, que precede a entrega/video) formaliza "gerar carga com `hey` ou `ab` e ver o HPA criar pods", e a US-F2-05 tem o criterio "Validado HPA: gerar carga e ver `kubectl get hpa` escalando". **Esta US formaliza essa validacao ad-hoc como testes reproduziveis, com SLOs versionados e evidencia coletada.**

**Restricoes e riscos ja mapeados:**

- **Rate limiting global.** Ha um `ThrottlerModule.forRoot` global (`ttl: 60000`, `limit: 100` req/60s) aplicado como `APP_GUARD` para toda a app (`src/app.module.ts` — `ThrottlerModule.forRoot` + `APP_GUARD` com `ThrottlerGuard`), com overrides por rota: `POST /auth/login` = 5 req/60s (`src/auth/infrastructure/auth.controller.ts`, decorator `@Throttle`) e `GET /ordens-servico/numero/:numero/status` = 30 req/60s. Um teste que martela a API **mede o throttler (HTTP 429), nao a app**. O throttler ja tem `skipIf` que o desativa quando `NODE_ENV === 'test'` ou `JEST_WORKER_ID` esta setado (`src/app.module.ts`) — gancho pronto, mas acoplar perf a `test` mistura semanticas. O hook dedicado `THROTTLER_DISABLED` **foi implementado** (`src/config/throttler.config.ts` — `shouldSkipThrottling` — usado no `skipIf` de `src/app.module.ts`).
- **`/health` e `/health/ready` tem `@SkipThrottle()` e `@Public()`** (`src/health/health.controller.ts`): sao alvos neutros para baseline/spike/soak (sem 429, sem JWT). `/health/ready` faz `SELECT 1` no Postgres, exercitando o pool. Ja `GET /ordens-servico` e `POST /ordens-servico` **NAO tem** `@SkipThrottle` — herdam o limite global de 100 req/60s e saturam em ~2s sob dezenas de VUs, virando medicao de 429 se o throttler nao for desativado.
- **HPA em `kind` exige `metrics-server`.** O `kind` nao instala `metrics-server` por padrao; sem ele o HPA fica com `TARGETS <unknown>/70%` e nunca escala. E preciso instala-lo com `--kubelet-insecure-tls` (certs self-signed do kubelet no kind) e **aguardar ele ficar `Available` + o HPA parar de reportar `<unknown>`** antes de qualquer teste de escalabilidade.
- **Divergencia de nomes entre os manifestos canonicos e a CI atual.** Os asserts de HPA desta US assumem a convencao **canonica da [US-F2-05](f2-05-manifestos-kubernetes.md)** (namespace `oficina`, deployment `app`, HPA `app` min=2/max=10, aplicados via `kubectl apply -k k8s/`). Porem o `k8s/` **ainda nao existe** (US-F2-05 To Do) e o unico deploy real hoje e o job do `.github/workflows/ci-cd.yml`, que aplica manifestos **inline via heredoc** usando namespace `mecanica`, deployment `mecanica-app`, HPA `mecanica-app-hpa` (min=1/max=3). Ou seja: divergem **namespace** (`oficina` vs `mecanica`), **nome de deployment** (`app` vs `mecanica-app`) **e** min/max do HPA. Rodar os comandos `kubectl` desta US contra a CI atual falharia por objeto inexistente. A reconciliacao e uma dependencia dura (ver secao Escalabilidade).
- **Onde a carga roda importa.** O `kind` roda no proprio runner (`ubuntu-latest`, ~2 vCPU / 7GB). No CI, o gerador de carga k6, os pods da app e o Postgres competem pela **mesma** CPU; um "scale-up ate max=10" e cientificamente fraco nesse ambiente (pods ficam `Pending`/CPU-starved). O CI prova o **mecanismo** do HPA (reage a carga), nao a capacidade real de 10 replicas — essa fica como validacao local/manual para o video.
- **A suite de carga NAO deve entrar no gate de cobertura nem no `npm test`** (nao gera cobertura de codigo e roda contra a app HTTP real, nao in-process).

## Objetivo

Criar uma suite de performance em `perf/`, isolada do Jest, executavel local e on-demand no CI, cobrindo os cinco tipos de teste (load, stress, spike, soak, escalabilidade), com thresholds versionados como codigo que **falham o processo (exit code != 0) quando um SLO e violado**, gerando relatorios (JSON/HTML) como artefatos.

SLOs-alvo de partida (deliberadamente frouxos para MVP, a apertar depois; sempre p95/p99, nunca media):

```
http_req_failed  (qualquer nao-2xx/3xx, INCLUINDO 429)  < 1%    (rate < 0.01)
http_req_duration  reads   (GET /health, GET /ordens-servico)   p95 < 500ms  / p99 < 1000ms
http_req_duration  writes  (POST /ordens-servico)               p95 < 800ms  / p99 < 1500ms
throughput minimo  (req/s)  ...........  observado e reportado (baseline no smoke)
saturacao CPU/mem dos pods  ...........  observada via metrics-server (>70% CPU = gatilho do HPA)
```

> Nos cenarios de performance o throttler esta DESATIVADO, entao **NAO deve existir nenhum 429**. Por isso o `http_req_failed` conta 429 como falha (comportamento nativo do k6): qualquer 429 reprova o teste como regressao de setup (throttler acidentalmente ligado). A expectativa/exclusao de 429 vive APENAS no cenario dedicado anti-DoS (throttler ligado).

## Criterios de Aceite

### Pre-requisito de codigo (hook do throttler)

- [ ] **Implementar o hook `THROTTLER_DISABLED` em `src/app.module.ts`**, estendendo o `skipIf` do `ThrottlerModule.forRoot` para tambem retornar `true` quando `process.env.THROTTLER_DISABLED === 'true'` (sem reusar a semantica de `NODE_ENV=test`/`JEST_WORKER_ID` para perf) — este e um **pre-requisito de codigo** para smoke/load/stress/spike/soak medirem a app e nao o throttler
- [ ] A imagem/deploy usados nos testes de performance devem subir com `THROTTLER_DISABLED=true` no ambiente (configmap/env), documentado no `perf/README.md`
- [ ] **Passo de sanidade anti-contaminacao:** antes de coletar numeros, uma rajada curta de N>100 req/60s contra `GET /ordens-servico` deve retornar **0% de 429**; se aparecer qualquer 429 o teste **falha** (throttler ainda ativo = numeros contaminados)

### Ferramentas e scripts

- [ ] Ferramenta principal = **k6** (Grafana), justificada: thresholds nativos sobre qualquer metrica/percentil (`http_req_duration` p(95)/p(99), `http_req_failed`) que reprovam o processo com exit code != 0, cenarios ricos com `stages`/`ramping-vus`, output machine-readable e binario externo (nao polui `package.json`)
- [ ] Ferramenta de smoke rapido = **autocannon** (npm, mesmo ecossistema Node) com fallback para `hey`/`ab` para o video da entrega
- [ ] Diretorio `perf/` na raiz com scripts k6: `smoke.js`, `load.js`, `stress.js`, `spike.js`, `soak.js`, `hpa.js`, e um `options.js`/`config.js` compartilhado parametrizado por env (`BASE_URL`, `VUS`, `DURATION`, `TEST_TYPE`, `AUTH_TOKEN`, e para o HPA-test: `K8S_NAMESPACE`, `K8S_DEPLOYMENT`, `K8S_HPA`)
- [ ] Scripts npm de conveniencia adicionados ao `package.json`: `perf:smoke`, `perf:load`, `perf:stress`, `perf:spike`, `perf:soak`, `perf:hpa` — **fora** de `test`/`test:all:cov` (nao contam para o gate de 80% de cobertura)
- [ ] A suite NAO e adicionada como Jest `project` nem ao script `test`; nao roda em cada PR por padrao

### Tipos de teste (load / stress / spike / soak) e onde rodam

- [ ] **Fonte-de-verdade = execucao LOCAL** contra `docker compose` (ou k6 apontando para app remota), onde ha CPU dedicada. No CI rodam apenas versoes **CURTAS/reduzidas** (smoke + load de 1-2min) como regressao, cientes de que o runner e co-tenant (SLOs podem ser relaxados nessa modalidade, documentado)
- [ ] **Load** (carga sustentada nominal): VUs de producao tipica por 5-10min (local) contra reads autenticadas (`GET /ordens-servico`) e `/health`; assert dos thresholds de p95/p99 e taxa de erro; `abortOnFail: true` (violar SLO = regressao clara)
- [ ] **Stress** (rampa acima do normal): ramp-up crescente ate saturar, para achar o joelho/ponto de ruptura; **NAO** usa `abortOnFail` (o objetivo e empurrar ate quebrar e mapear onde); reporta o VU/throughput em que os SLOs comecam a degradar **E** aplica um gate de regressao versionado: o joelho observado deve ser **>= baseline minimo** (ex: sustentar `STRESS_MIN_VUS` VUs sem violar p95 de reads); abaixo disso o step **falha**
- [ ] **Spike** (pico subito): ramp-up quase zero para VUs muito altos contra `/health`, valida sobrevivencia e recuperacao pos-pico; `abortOnFail` opcional so na fase pos-pico; thresholds de erro/latencia como gate
- [ ] **Soak/endurance** (carga moderada por 20-30min, local): detecta vazamento de memoria/degradacao ao longo do tempo. Duas asserts **separadas**: (1) **p95 estavel sem crescimento monotonico** — medido pelo k6 (gate, com `delayAbortEval` bem maior ou apenas alerta, para nao abortar em degradacao transitoria); (2) **memoria do pod** — o k6 NAO ve memoria de pod, entao coletar via `kubectl top pod`/metrics-server amostrado periodicamente, salvo como serie temporal no artefato, com criterio "sem tendencia de crescimento sustentado" **observado e reportado** (nao gate rigido no MVP)
- [ ] Cada script parametrizado por env para reuso entre local/kind/staging sem duplicar codigo; a config de threshold (`abortOnFail`, `delayAbortEval`) e **diferenciada por tipo de teste** no `options.js` compartilhado, nao um `abortOnFail` unico global

### SLOs e thresholds (como codigo)

- [ ] Thresholds definidos **no proprio script k6** (versionados): `http_req_failed rate<0.01`; `http_req_duration p(95)<500 && p(99)<1000` para reads; `p(95)<800 && p(99)<1500` para writes
- [ ] Violacao de qualquer threshold faz o k6 sair com exit code != 0 (reprova o step/local)
- [ ] Nos cenarios de performance (throttler off) o `http_req_failed` **inclui** 429 como falha (sem exclusao): como nao deve existir 429, qualquer 429 reprova (sinal de setup errado), coerente com o passo de sanidade
- [ ] `abortOnFail: true` com `delayAbortEval: '30s'` **apenas em load/smoke** (ignora ramp-up inicial e aborta cedo em regressao grave); stress e soak usam config propria (ver acima)
- [ ] Throughput (req/s) e saturacao CPU/mem sao **observados e reportados**, nao gate rigido no MVP
- [ ] Documentado no `perf/README.md` que os SLOs sao ponto de partida frouxo a ser apertado

### Tratamento do rate limiting (throttler)

- [ ] A app-alvo dos testes de performance sobe com o throttler **desativado** via `THROTTLER_DISABLED=true` (hook implementado na secao de pre-requisito), de modo que os testes medem a app e nao o throttler
- [ ] Criterio explicito: **o resultado de load/stress/spike/soak nao pode conter nenhum HTTP 429 do throttler** (429 tratado como erro/regressao de setup e reprova via `http_req_failed`)
- [ ] `/auth/login` (limite 5/60s) e usado **apenas como passo de setup** para obter o JWT uma vez e reusar o token nos cenarios autenticados — nunca como alvo de martelo
- [ ] Cenario dedicado e **separado** (`perf/throttler.js` ou similar) que valida o proprio throttler: com o rate limit **ATIVO** (`THROTTLER_DISABLED` ausente/false), abusar de uma rota e assertar que retorna 429 (prova anti-DoS). Este e o **unico** cenario que espera/tolera 429 (via `responseCallback`/expectativa custom) e **nao entra nos SLOs de performance**

### Escalabilidade / HPA em kind

- [ ] **Reconciliacao de nomes (dependencia dura, ANTES de qualquer assert):** definir e fixar os nomes canonicos alinhados a [US-F2-05](f2-05-manifestos-kubernetes.md): namespace `oficina`, deployment com `metadata.name: app` e HPA correspondente (min=2, max=10). Marcar como dependencia que a US-F2-05 **fixe `metadata.name` do Deployment** e que o [ci-cd.yml](../../.github/workflows/ci-cd.yml) seja migrado dos manifestos inline (`mecanica`/`mecanica-app`/`mecanica-app-hpa`/min=1-max=3) para `kubectl apply -k k8s/` com a convencao `oficina`/`app`. Os scripts de assert parametrizam `K8S_NAMESPACE`/`K8S_DEPLOYMENT`/`K8S_HPA` por env (default `oficina`/`app`/`app`) para nao hardcodar
- [ ] Pre-requisito automatizado do `metrics-server`: instalar no `kind` com `--kubelet-insecure-tls`; **aguardar `kubectl rollout status deploy/metrics-server -n kube-system --timeout=120s`** e depois **fazer poll de `kubectl get hpa` ate `TARGETS` deixar de ser `<unknown>`** (com timeout) ANTES de iniciar a carga — senao o assert le `<unknown>` e falha por falso-negativo. **Firmar** (nao "considerar") o `metrics-server` como addon reproduzivel em `infra/terraform/01-cluster` para que local e CI usem o mesmo caminho
- [ ] Deploy do alvo via `kubectl apply -k k8s/` (manifestos canonicos da US-F2-05), **nao** os heredocs inline `mecanica-app` do ci-cd.yml atual
- [ ] **Carga reproduzivel para cruzar 70% de CPU** (parametros versionados, nao "carga suficiente" vago):
  - (1) fixar/documentar o `resources.requests.cpu` esperado do pod (ex: 100m-250m, propositalmente **baixo** para caber no runner) como pre-condicao vinda da US-F2-05, ja que ele e o denominador da utilizacao que o HPA calcula
  - (2) `perf/hpa.js` com `VUS`/`DURATION` default definidos, validados empiricamente por saturar >70% naquele `requests.cpu`
  - (3) usar um alvo **confiavelmente CPU-bound** no pod: `GET /ordens-servico` tende a ficar I/O-bound no Postgres single-replica (o pod espera o DB e pode nunca cruzar 70%). Validar empiricamente com `kubectl top pod` que a CPU do **POD** (nao do Postgres) passa de 70%; se nao passar, usar o **HPA por memoria** (tambem definido na US-F2-05) como gatilho alternativo, ou documentar dataset/serializacao pesada que gaste CPU no pod
  - (4) **verificacao intermediaria obrigatoria:** `kubectl top pods` / `kubectl get hpa` mostrando `TARGETS` acima de 70% como evidencia de que a carga cruzou o gatilho, ANTES de assertar o scale-up (senao um scale-up ausente e ambiguo: falta de carga vs HPA quebrado)
- [ ] **Assert de scale-up (limiar numerico + janela temporal):** sob a carga sustentada de `perf/hpa.js`, `.status.replicas` do deployment canonico deve atingir **>= `HPA_MIN_SCALE` replicas (ex: >=4)** dentro de **`HPA_SCALEUP_TIMEOUT` segundos (ex: 300s)** do inicio da carga; caso contrario o teste **falha** (exit != 0). No CI (single-node kind), o alvo e provar a **reacao** do HPA (replicas > min), nao atingir max=10; `max=10` fica como validacao manual/local para o video
- [ ] **Assert de scale-down (limiar + janela):** apos remover a carga, `.status.replicas` deve voltar a **exatamente `min` (2)** dentro da janela de estabilizacao (~300s + margem), **sem exceder K oscilacoes** (anti-thrashing)
- [ ] **Saude da app DURANTE o evento de escala (o "sem falhar"):** durante toda a carga do teste de escalabilidade o k6 mantem os mesmos thresholds de `http_req_failed rate<0.01` e p95 de reads; o teste so passa se **replicas escalaram E os SLOs de erro/latencia se mantiveram** durante o rollout dos pods novos (justamente quando pods novos ainda nao passaram readiness e o rollout pode derrubar requests)
- [ ] Script/loop de polling que coleta `.status.replicas` e `kubectl get hpa` no tempo e aplica as asserts acima com exit code
- [ ] Evidencia coletada: `kubectl describe hpa`, log de replicas ao longo do tempo, serie de `kubectl top pod` e o sumario k6 salvos como artefato — alimenta o video da entrega

### CI on-demand e relatorios

- [ ] Novo workflow `.github/workflows/perf-test.yml` disparado **apenas por `workflow_dispatch`** (opcionalmente `schedule` noturno), com input `test_type` do tipo choice (`smoke|load|stress|spike|soak|hpa`, default `smoke`) — **nunca no push/PR padrao** para nao deixar o pipeline principal lento (o `ci-cd.yml` ja tem alvo <10min)
- [ ] O job de escalabilidade reutiliza o padrao **de fato** reaproveitavel do `ci-cd.yml`: (a) kind efemero via `helm/kind-action` e (b) `kind load` da imagem (`kind load image-archive`/`docker-image`). **NAO** reaproveita os manifestos inline `mecanica`: deploy via `kubectl apply -k k8s/` (canonico `oficina`/`app`), o que implica a US-F2-05 estar implementada (`k8s/` existente) ou o job inline ser migrado para o namespace/nome canonicos primeiro. Adiciona o passo de `metrics-server` (com espera de readiness) que hoje falta
- [ ] Actions oficiais `grafana/setup-k6-action` + `grafana/run-k6-action` (ou execucao direta do binario)
- [ ] Relatorios via `handleSummary()` do k6: `summary.json` + `report.html`, mais `--summary-export` / `--out json`; salvos em `reports/perf/` (ou `coverage/load/`) e publicados com `actions/upload-artifact` (`if: always()`)
- [ ] Resumo legivel (p95/p99, taxa de erro, throughput e replicas do HPA) escrito em `$GITHUB_STEP_SUMMARY`

### Documentacao

- [ ] `perf/README.md` (ou secao no `README.md`) explica: como rodar cada tipo localmente (`npm run perf:smoke`, `perf:load`, ...), quais envs configurar (`BASE_URL`, `THROTTLER_DISABLED`, `AUTH_TOKEN`, `K8S_NAMESPACE`/`K8S_DEPLOYMENT`/`K8S_HPA`), como rodar o teste de HPA em `kind` (passos do `metrics-server` + espera de readiness) e onde encontrar os relatorios/artefatos
- [ ] Deixar explicito que a suite roda **on-demand**, contra a app HTTP real (nao in-process), e **nao conta para o gate de 80%** de cobertura unit/integration
- [ ] Deixar explicito que, no CI (kind single-node no runner de 2 vCPU), o HPA-test prova o **mecanismo** (reacao), nao a capacidade real de 10 replicas — o `scale-up ate max=10` e validacao local/manual para o video
- [ ] Criar o `QA_PLAN` correspondente em `docs/qa-plans/QA_PLAN_US-F2-11.md` (regra mandatoria do CLAUDE.md; prefixo `F2` para evitar colisao com a US-11 da Fase 1 — `11-orcamento-automatico.md`), com um cenario por criterio de aceite (cada SLO, cada tipo de teste, tratamento do throttler, sanidade anti-429 e evidencia de scale-up/scale-down do HPA)

## Notas

- Base de testes existente (unit + integracao, gate 80%) em [US-22](22-testes-cobertura.md); esta US **complementa** com a dimensao nao-funcional (performance/escalabilidade), sem alterar aquela suite.
- Depende de [US-F2-05](f2-05-manifestos-kubernetes.md) **concluida** (HPA + `resources.requests`, `metadata.name` do Deployment fixado, `k8s/` existente — obrigatorios para o HPA por CPU calcular utilizacao e para os asserts terem alvo) e de [US-F2-07](f2-07-cicd-completo.md) tendo migrado o deploy de heredoc inline (`mecanica`) para `kubectl apply -k k8s/` (`oficina`/`app`). Os testes de load/stress/spike/soak nao-HPA podem rodar antes, contra `docker compose` local.
- A reconciliacao de nomes (`mecanica`->`oficina`, `mecanica-app`->`app`, HPA min=1/max=3 -> min=2/max=10) e uma **dependencia dura**, nao um detalhe: os comandos `kubectl` desta US assumem a convencao canonica da US-F2-05.
- Comecar simples (smoke -> cargas maiores e duracoes mais longas) e apertar os SLOs iterativamente.
- Recomendar (e firmar) `metrics-server` como addon reproduzivel no Terraform (`infra/terraform/01-cluster`) para que local e CI comportem-se igual, com a flag `--kubelet-insecure-tls`.
