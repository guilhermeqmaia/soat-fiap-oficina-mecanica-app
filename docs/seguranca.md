# Segurança — Análise e Pipeline

Este documento descreve a esteira de análise de qualidade e segurança do projeto, e serve de base para o **relatório final de vulnerabilidades** (preenchido ao encerramento da Fase 1).

## 1. Arquitetura da esteira

```
GitHub Actions (.github/workflows/security.yml)
│
├── Job test           → npm run test:unit:cov (gate Jest 80%)
│                        artifact: coverage-lcov
│
├── Job security       → Semgrep p/owasp-top-ten
│                      → npm audit --audit-level=high
│                      → Trivy fs (vuln + secret + misconfig)
│                        falha em HIGH/CRITICAL
│
├── Job sonar          → SonarQube Community (service container efêmero)
│   (needs: test)        sonar-scanner-action
│                        artifact: sonar-report/{owasp-issues.json, measures.json}
│
└── Job dependency-review (só em PR)
    └── Bloqueia PR que introduz dep vulnerável (HIGH+)
```

**Gates que fazem o PR falhar:**
- Cobertura < 80% (unit tests)
- Semgrep encontra padrão OWASP Top 10 (ERROR/WARNING)
- `npm audit` com vuln HIGH ou CRITICAL
- Trivy com vuln/secret/misconfig HIGH ou CRITICAL
- Dependency Review detecta dep nova vulnerável (HIGH+)

## 2. Ferramentas

| Camada | Tool | Cobertura | Local de execução |
|---|---|---|---|
| SAST (OWASP Top 10) | Semgrep + ruleset `p/owasp-top-ten` | Injeção, XSS, auth/session, crypto, SSRF, IDOR, etc. | CI |
| Quality + SAST agregado | SonarQube Community | Bugs, vulnerabilities, security hotspots, code smells, duplicação, coverage | CI (ephemeral) + local (dashboard histórico) |
| Dependências npm | `npm audit` | CVEs em pacotes transitivos e diretos | CI |
| Filesystem (deps + secrets + misconfig) | Trivy fs | CVEs, secrets hardcoded, misconfig Docker | CI |
| PR gatekeeper | GitHub `dependency-review-action` | Bloqueia dep vulnerável no PR | CI |

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

## 4. Como ler os resultados do CI

- **Tab Actions** → workflow `Security & Quality` → job quiser inspecionar.
- **Job `sonar`** produz artifact `sonar-report` com:
  - `owasp-issues.json` — issues marcadas com tag `owasp-top10`
  - `measures.json` — bugs, vulnerabilidades, hotspots, coverage, duplicação
- **Job `security`** mostra logs do Semgrep, npm audit e Trivy. Se falhar, o output no log aponta arquivo+linha.

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
