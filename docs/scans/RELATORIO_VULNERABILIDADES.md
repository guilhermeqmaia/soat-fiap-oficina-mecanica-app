# Relatório de Análise de Vulnerabilidades — Tech Challenge

Relatório consolidado dos scans de segurança e qualidade aplicados sobre o back-end do MVP da oficina mecânica. Este documento atende ao item **"Relatório com análise de vulnerabilidades"** dos entregáveis da Fase 1.

A esteira completa que produziu estes resultados está descrita em [docs/seguranca.md](../seguranca.md) e implementada em [.github/workflows/security.yml](../../.github/workflows/security.yml).

---

## 1. Escopo analisado

| Item                             | Detalhe                                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Versão analisada                 | commit `4e5b926` (branch `main`)                                                                            |
| Data da análise                  | 2026-05-01                                                                                                  |
| Stack                            | NestJS 10 + TypeScript 5 + Prisma + PostgreSQL 15                                                           |
| Linhas de código (src/)          | ~27.235 LOC totais; 109 arquivos fonte instrumentados (excluindo `*.module.ts`, `main.ts`, gerados, testes) |
| Cobertura de testes (gate ≥ 80%) | **99,9% linhas / 98,1% branches / 100% funções** (unit) — extraído de `coverage/unit/lcov.info`             |
| Frontends auditados              | `web/admin`, `web/cliente` (somente análise de dependências e Dockerfile)                                   |

---

## 2. Resumo executivo

| Severidade | Semgrep (OWASP) | Trivy (vuln+secret+misconfig) | npm audit       | Total |
| ---------- | --------------- | ----------------------------- | --------------- | ----- |
| Critical   | 0               | 0                             | 0               | **0** |
| High       | 0               | 0                             | 0               | **0** |
| Moderate   | 0               | 0                             | 7 (somente dev) | **7** |
| Low / Info | 0               | 0                             | 0               | **0** |

**Resultado:** o sistema **passa todos os gates de segurança configurados no CI** (HIGH/CRITICAL = 0). As 7 vulnerabilidades moderate restantes estão exclusivamente em dependências de desenvolvimento/teste e não afetam o artefato em produção — detalhamento e justificativa na seção [§5.2](#52-findings-aceitos-com-justificativa).

---

## 3. Ferramentas e cobertura

| Camada                                         | Ferramenta                | Versão    | Findings                                             | Output cru                                                     |
| ---------------------------------------------- | ------------------------- | --------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| SAST OWASP Top 10                              | Semgrep `p/owasp-top-ten` | `1.161.0` | 0 (em 391 arquivos)                                  | [`raw/semgrep-owasp-top10.json`](raw/semgrep-owasp-top10.json) |
| Vulnerabilidades em dependências               | npm audit                 | `npm@10`  | 0 HIGH+ / 7 moderate                                 | [`raw/npm-audit.json`](raw/npm-audit.json)                     |
| Filesystem (deps + secrets + misconfig Docker) | Trivy fs                  | `0.58.2`  | 0 HIGH+ em 6 alvos                                   | [`raw/trivy-fs.json`](raw/trivy-fs.json)                       |
| Quality + SAST agregado                        | SonarQube Community       | 10.6      | Executado em CI (artifact `sonar-report` no Actions) | (não bloqueante)                                               |

### 3.1 Capturas das execuções

#### Semgrep — OWASP Top 10 (gate verde)

![Semgrep OWASP Top 10 — 0 findings em 391 arquivos](img/semgrep-owasp-top10.png)

> Saída do comando `semgrep --config=p/owasp-top-ten /src` no commit `4e5b926`. Resultado: **0 findings** (gate aprovado).

#### SonarQube — Overview do projeto

![SonarQube Overview — Bugs / Vulnerabilities / Security Hotspots / Coverage](img/sonarqube-overview.png)

> Dashboard do projeto `tech-challenge` em `http://localhost:9000` após scan local. Métricas-chave: Bugs, Vulnerabilities, Security Hotspots, Coverage e Duplications.

#### SonarQube — Security Hotspots / OWASP Top 10

![SonarQube Security Hotspots — categorias OWASP](img/sonarqube-security-hotspots.png)

> Aba **Security Hotspots** com agrupamento por categoria OWASP Top 10.

---

## 4. OWASP Top 10 — Mapeamento dos findings

| Categoria                                        | Findings encontrados        | Mitigações já aplicadas no MVP                                                                                                                                                                  | Status                             |
| ------------------------------------------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **A01 Broken Access Control**                    | 0                           | RBAC por rota (`@Roles` decorator), `RequireAuth` no frontend, validação de propriedade da OS pelo cliente (`NotOwnedByUserError`)                                                              | ✅ Mitigado                        |
| **A02 Cryptographic Failures**                   | 0                           | Senhas com bcrypt (cost 10); JWT assinado HS256 com secret obrigatório via env; `JWT_SECRET` validado no boot                                                                                   | ✅ Mitigado                        |
| **A03 Injection**                                | 0                           | Prisma ORM (queries parametrizadas); `class-validator` em todos os DTOs; `ParseUUIDPipe` em rotas com `:id`                                                                                     | ✅ Mitigado                        |
| **A04 Insecure Design**                          | 0                           | DDD com Value Objects (CpfCnpj, Placa, Email) validando no domínio; state machine da OS implementada na entidade; Unit of Work no estoque                                                       | ✅ Mitigado                        |
| **A05 Security Misconfiguration**                | 1                           | Container app roda como `node` (não-root); frontends usam `nginxinc/nginx-unprivileged` (uid 101); CORS restrito. **Pendente:** rate limiting (`@nestjs/throttler`) e Helmet ainda **não** implementados; Swagger exposto em todos os ambientes | ⚠️ Parcial (hardening pendente)    |
| **A06 Vulnerable & Outdated Components**         | 7 moderate (todas dev-only) | npm audit no CI bloqueando HIGH+; Trivy fs cobrindo `package-lock.json`; Renovate/Dependabot recomendados em prod                                                                               | ⚠️ Aceito com justificativa (§5.2) |
| **A07 Identification & Authentication Failures** | 1                           | JWT com expiração curta; bcrypt; usuário revalidado no DB a cada request (rejeita inativo). **Pendente:** rate limiting / `@Throttle` no `/auth/login` ainda **não** implementado (brute-force online não mitigado) | ⚠️ Parcial (rate-limit pendente)   |
| **A08 Software & Data Integrity Failures**       | 0                           | `package-lock.json` versionado; Actions pinned por SHA (`@34e114876b…`); `npm ci` em todos os jobs; container images com tag fixa                                                               | ✅ Mitigado                        |
| **A09 Security Logging & Monitoring Failures**   | 0                           | Logger HTTP estruturado; CorrelationIdInterceptor (UUID v4 propagado); Audit log de OS persistido em `ordem_de_servico_audit_log`                                                               | ✅ Mitigado                        |
| **A10 Server-Side Request Forgery (SSRF)**       | 0                           | Sem chamadas HTTP outbound a URLs vindas de input do usuário; notificador atual é mock interno                                                                                                  | ✅ Mitigado                        |

---

## 5. Detalhamento dos findings

### 5.1 Findings ativos

Nenhum finding **HIGH** ou **CRITICAL** ativo no commit analisado (gate verde).

### 5.2 Findings aceitos com justificativa

Os 7 avisos `moderate` reportados pelo `npm audit` são todos transitivos a partir de dependências **de desenvolvimento e teste**, sem alcance no bundle de produção:

| Pacote                                 | CVE / Advisory                                                                                                                  | Cadeia                                         | Justificativa                                                                                                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@hono/node-server` < 1.19.13          | [GHSA-92pp-h63x-v22m](https://github.com/advisories/GHSA-92pp-h63x-v22m) — middleware bypass via `serveStatic`                  | `prisma` → `@prisma/dev` → `@hono/node-server` | `@prisma/dev` é uma ferramenta de desenvolvimento opcional do CLI Prisma; `serveStatic` não é exposto pelo nosso pipeline. Em produção rodamos `prisma migrate deploy`, não o dev server. |
| `@prisma/dev` (qualquer versão)        | Transitiva da anterior                                                                                                          | `prisma` → `@prisma/dev`                       | Mesmo motivo; o fix exige bump major do `prisma` (6.x). Avaliado para sprint de manutenção pós-MVP.                                                                                       |
| `prisma` ≥ 6.20.0-dev.1                | Transitiva                                                                                                                      | `prisma` (devDependency)                       | Idem.                                                                                                                                                                                     |
| `uuid` < 14.0.0                        | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) — buffer bounds em `v3/v5/v6` quando `buf` é fornecido | `testcontainers` → `dockerode` → `uuid`        | `testcontainers` é usado **apenas** em testes de integração; nunca chamamos `uuid.v3/v5/v6` com buffer customizado.                                                                       |
| `dockerode` 4.0.3–4.0.12               | Transitiva                                                                                                                      | `testcontainers` → `dockerode`                 | Idem; só ativa em CI/testes.                                                                                                                                                              |
| `testcontainers` ≥ 10.22.0             | Transitiva                                                                                                                      | devDependency direta                           | Idem. Fix requer downgrade major.                                                                                                                                                         |
| `@testcontainers/postgresql` ≥ 10.22.0 | Transitiva                                                                                                                      | devDependency direta                           | Idem.                                                                                                                                                                                     |

**Risco residual:** baixo. Nenhum dos pacotes acima é incluído no bundle produzido por `npm run build` ou copiado para a imagem de produção (que faz `npm ci --omit=dev` indiretamente via build multi-stage).

### 5.3 Mitigações aplicadas durante o desenvolvimento

Itens corrigidos ao longo do projeto, identificados por scans/code review:

- **Container do app rodando como root** → adicionado `USER node` ao [Dockerfile](../../Dockerfile).
- **Containers nginx dos frontends rodando como root** (achado Semgrep) → migrados para `nginxinc/nginx-unprivileged:1.27-alpine` + `USER 101` + porta 8080.
- **Validação de CPF/CNPJ e Placa só no DTO** → movida para Value Objects no domínio, garantindo invariante mesmo em criações via repositório.
- **Endpoint de listagem de OS exposto a CLIENTE** (risco de IDOR / A01) → cliente só pode buscar OS por número via endpoint dedicado que valida ownership (`NotOwnedByUserError`).
- **JWT_SECRET com fallback inseguro** → bootstrap falha se a env não estiver definida.

---

## 6. Como reproduzir os scans

```bash
# 1. Semgrep OWASP Top 10
docker run --rm -v "$PWD:/src" semgrep/semgrep:1.161.0 \
  semgrep --config=p/owasp-top-ten --json /src > docs/scans/raw/semgrep-owasp-top10.json

# 2. npm audit (mesma versão do gate de CI)
npm audit --json > docs/scans/raw/npm-audit.json
npm audit --audit-level=high  # gate: deve sair com exit 0

# 3. Trivy fs (vuln + secret + misconfig)
docker run --rm -v "$PWD:/src" aquasec/trivy:0.58.2 fs \
  --scanners vuln,secret,misconfig \
  --severity HIGH,CRITICAL --ignore-unfixed \
  --skip-dirs node_modules,dist,coverage,web/admin/node_modules,web/cliente/node_modules \
  --format json /src > docs/scans/raw/trivy-fs.json
```

A esteira de CI roda esses três passos a cada push/PR para `main`, com **gate em HIGH/CRITICAL**. Sonar roda como serviço efêmero e gera artifact `sonar-report` (não bloqueante).

---

## 7. Anexos

- [`raw/semgrep-owasp-top10.json`](raw/semgrep-owasp-top10.json) — output bruto Semgrep
- [`raw/npm-audit.json`](raw/npm-audit.json) — output bruto npm audit
- [`raw/trivy-fs.json`](raw/trivy-fs.json) — output bruto Trivy fs
- [docs/seguranca.md](../seguranca.md) — descrição completa da esteira de qualidade e segurança
- [.github/workflows/security.yml](../../.github/workflows/security.yml) — workflow CI que executa todos os gates
