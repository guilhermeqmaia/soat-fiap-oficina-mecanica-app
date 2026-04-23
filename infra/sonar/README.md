# SonarQube local (Community Edition)

Stack isolada para análise de qualidade e segurança. **Não sobe junto com a app** — roda só quando você quer inspecionar o código em profundidade.

## Pré-requisito: limite de memória do Docker

Aumente `vm.max_map_count` no host (Sonar falha com menos que 262144):

```bash
# macOS (Docker Desktop ja vem alto, confira)
docker run --rm --privileged alpine sysctl vm.max_map_count

# Linux
sudo sysctl -w vm.max_map_count=262144
```

## Subir

```bash
docker compose -f infra/sonar/docker-compose.sonar.yml up -d
# Aguarde ~2 min ate SonarQube estar UP
curl -s http://localhost:9000/api/system/status
```

## Setup inicial (primeira vez)

1. Acesse http://localhost:9000
2. Login `admin` / `admin` — troque a senha na primeira tela
3. **Create new project (manually)**:
   - Project display name: `Tech Challenge`
   - Project key: `tech-challenge` (deve bater com `sonar-project.properties`)
4. **Generate token**: `My Account → Security → Generate Token` — copie

## Rodar scan

```bash
# Gera coverage fresco
npm run test:unit:cov

# Exporta token e dispara o scanner (imagem Docker oficial, sem instalar nada)
export SONAR_TOKEN=<token-gerado>
npm run sonar:local
```

Resultados em http://localhost:9000/dashboard?id=tech-challenge

## Derrubar (sem perder dashboard)

```bash
docker compose -f infra/sonar/docker-compose.sonar.yml down
```

Histórico persiste nos volumes `sonar_data` e `sonar_pg_data`.

## Reset total

```bash
docker compose -f infra/sonar/docker-compose.sonar.yml down -v
```
