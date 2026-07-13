# Segurança — Análise e Pipeline

Este documento descreve a esteira de análise de qualidade e segurança do projeto, e serve de base para o **relatório final de vulnerabilidades** (preenchido ao encerramento da Fase 1).

## 1. Arquitetura da esteira

Os scans de segurança/qualidade rodam **localmente / sob demanda** (via CLI), e seus resultados crus ficam versionados em [`docs/scans/raw/`](./scans/raw/). O único pipeline em **GitHub Actions** ([`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml)) é o de **build/teste/deploy** — ele garante que a aplicação **builda e passa nos testes**, mas **não** contém jobs de segurança nem gate de vulnerabilidade.

```
Local / sob demanda (CLI)                        →  docs/scans/raw/
├── Semgrep  p/owasp-top-ten                     →  semgrep-owasp-top10.json
├── npm audit --audit-level=high                 →  npm-audit.json
├── Trivy fs (vuln + secret + misconfig)         →  trivy-fs.json
└── SonarQube Community (dashboard local :9000)  →  npm run sonar:up / sonar:local

GitHub Actions — .github/workflows/ci-cd.yml (build / teste / deploy)
├── Testes: unit + integração (testcontainers) + gate de cobertura 80%
├── Build da aplicação (NestJS)
├── Build + push da imagem Docker (GHCR)
└── Provisionamento (Terraform) + deploy em kind + smoke test /health
```

**Gate automatizado (CI de testes):** cobertura de testes **< 80%** reprova o pipeline. **Não há** gate de segurança bloqueando PRs — os findings de Semgrep / Trivy / npm audit / SonarQube são avaliados manualmente e consolidados no [relatório de vulnerabilidades](./scans/RELATORIO_VULNERABILIDADES.md).

## 2. Ferramentas

| Camada | Tool | Cobertura | Execução |
|---|---|---|---|
| SAST (OWASP Top 10) | Semgrep + ruleset `p/owasp-top-ten` | Injeção, XSS, auth/session, crypto, SSRF, IDOR, etc. | Local / sob demanda (CLI) → `docs/scans/raw/` |
| Quality + SAST agregado | SonarQube Community | Bugs, vulnerabilities, security hotspots, code smells, duplicação, coverage | Local (dashboard `:9000`) |
| Dependências npm | `npm audit` | CVEs em pacotes transitivos e diretos | Local / sob demanda (CLI) |
| Filesystem (deps + secrets + misconfig) | Trivy fs | CVEs, secrets hardcoded, misconfig Docker | Local / sob demanda (CLI) |

## 3. SonarQube local (análise profunda)

Para investigar code smells e security hotspots com o dashboard completo, use o stack local:

```bash
# Sobe SonarQube + Postgres isolados
npm run sonar:up

# Aguarde ~2 min, acesse http://localhost:9000 (admin/admin, troque a senha)
# Crie projeto com key "tech-challenge" e gere um token

# Gera coverage atualizado e dispara scan
npm run test:unit:cov
export SONAR_TOKEN=<seu-token>
npm run sonar:local
```

Detalhes em [infra/sonar/README.md](../infra/sonar/README.md).

## 4. Como ler os resultados dos scans

- **Outputs crus** em [`docs/scans/raw/`](./scans/raw/): `semgrep-owasp-top10.json`, `npm-audit.json`, `trivy-fs.json`.
- **Relatório consolidado** em [`docs/scans/RELATORIO_VULNERABILIDADES.md`](./scans/RELATORIO_VULNERABILIDADES.md) (findings + severidade + decisão).
- **SonarQube**: dashboard local em `http://localhost:9000` após `npm run sonar:up` e `npm run sonar:local` (bugs, vulnerabilities, security hotspots, coverage, duplicação).
- **CI de testes** ([`ci-cd.yml`](../.github/workflows/ci-cd.yml)): a aba **Actions** mostra os passos de build/teste/deploy; o artifact `coverage-lcov` traz a cobertura usada no gate de 80%.

---

## 5. Relatório Final OWASP Top 10

> **A ser preenchido ao encerramento do projeto**, consolidando findings do Sonar + Semgrep + Trivy.

### 5.1 Escopo analisado

| Item | Detalhe |
|---|---|
| Versão analisada | _tag ou commit_ |
| Data da análise | _YYYY-MM-DD_ |
| Cobertura de testes | _XX%_ (unit) / _XX%_ (integration) |
| LOC analisadas | _XXXX_ |

### 5.2 Resumo executivo

| Severidade | Sonar | Semgrep | Trivy | npm audit | Total |
|---|---|---|---|---|---|
| Critical | | | | | |
| High | | | | | |
| Medium | | | | | |
| Low | | | | | |

### 5.3 OWASP Top 10 — Mapeamento dos findings

Para cada categoria: lista de findings, severidade, arquivo/linha, decisão (mitigado / aceito com justificativa / backlog).

| Categoria | Findings | Mitigações aplicadas | Status |
|---|---|---|---|
| A01:2021 — Broken Access Control | | | |
| A02:2021 — Cryptographic Failures | | | |
| A03:2021 — Injection | | | |
| A04:2021 — Insecure Design | | | |
| A05:2021 — Security Misconfiguration | | | |
| A06:2021 — Vulnerable and Outdated Components | | | |
| A07:2021 — Identification and Authentication Failures | | | |
| A08:2021 — Software and Data Integrity Failures | | | |
| A09:2021 — Security Logging and Monitoring Failures | | | |
| A10:2021 — Server-Side Request Forgery (SSRF) | | | |

### 5.4 Mitigações aplicadas

_Lista objetiva das correções feitas no escopo deste trabalho (ex.: bump de pacote X, remoção de endpoint não autorizado, sanitização de input Y)._

### 5.5 Findings aceitos com justificativa

_Riscos residuais que não foram tratados (ex.: dep sem fix upstream, endpoint administrativo atrás de VPN)._

### 5.6 Recomendações para produção

_Itens que ficam como recomendação além do escopo do MVP (ex.: rate limiting, WAF, rotação de segredos, monitoramento)._

### 5.7 Anexos

- [docs/scans/](./scans/) — outputs crus dos scans usados no relatório
- Capturas do dashboard SonarQube (print do overview + security hotspots)
