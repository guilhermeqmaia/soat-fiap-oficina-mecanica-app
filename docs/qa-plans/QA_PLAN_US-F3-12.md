# QA Plan — US-F3-12: Entrega — Video, PDF e Compartilhamento

## Resumo
Checklist de validacao do pacote de entrega: video (<= 15 min) cobrindo os seis pontos exigidos, PDF unico com links e confirmacoes, e acessos (`soat-architecture` nos 4 repos, `main` protegida, deploy ativo).

## Pre-requisitos
- Ambiente no ar para gravar (`caffeinate -i scripts/aws-deploy-all.sh`, ou `aws-resume.sh` se pausado) com o coletor de observabilidade instalado
- Roteiro ensaiado; cronometro

## Cenarios de Teste

### TS-01: Video — autenticacao com CPF
- **Tipo:** Manual
- **Criterio:** Fluxo cliente -> API Gateway -> Lambda -> JWT
- **Passos:** mostrar `POST $GW/auth` com CPF do seed retornando `accessToken`; decodificar as claims
- **Resultado esperado:** trecho gravado (< 2 min)

### TS-02: Video — pipeline CI/CD executando
- **Passos:** abrir um PR pequeno (ou re-disparar um CD) e mostrar CI verde, plan comentado, run de CD com OIDC
- **Resultado esperado:** trecho gravado

### TS-03: Video — deploy automatizado para a nuvem
- **Passos:** merge -> `cd-aws.yml` -> imagem no ECR -> rollout no EKS -> smoke test
- **Resultado esperado:** trecho gravado (usar um deploy real ou o log de um run recente)

### TS-04: Video — consumo das APIs protegidas
- **Passos:** `GET $GW/clientes` sem token (401), com token (200); cliente vendo as proprias OS
- **Resultado esperado:** trecho gravado

### TS-05: Video — dashboard com analise ao vivo
- **Passos:** gerar trafego (k6) e mostrar os dashboards de negocio e tecnico atualizando; mostrar um alerta
- **Resultado esperado:** trecho gravado (QA_PLAN_US-F3-11 TS-12)

### TS-06: Video — logs e traces em execucao
- **Passos:** `kubectl logs ... | jq` com `correlationId`; trace no APM com os logs ligados
- **Resultado esperado:** trecho gravado

### TS-07: Video — duracao e publicacao
- **Criterio:** YouTube/Vimeo, publico ou nao listado, ate 15 min
- **Passos:** publicar; conferir duracao e visibilidade em janela anonima
- **Resultado esperado:** <= 15:00, acessivel pelo link

### TS-08: PDF unico
- **Criterio:** Links dos 4 repos, do video, das documentacoes; confirmacao do `soat-architecture`
- **Passos:** abrir o PDF e clicar em cada link (repos, video, `docs/arquitetura` — RFCs/ADRs/diagramas, `docs/schema.dbml`, Swagger/Postman)
- **Resultado esperado:** todos os links abrem; confirmacao do colaborador presente

### TS-09: Acessos
- **Criterio:** `soat-architecture` nos 4 repos; `main` protegida; deploy ativo validado
- **Passos:**
  1. `for r in ...; do gh api repos/guilhermeqmaia/soat-fiap-oficina-$r/collaborators/soat-architecture; done`
  2. Regras de branch (QA_PLAN_US-F3-07 TS-03); print para o PDF
  3. `curl -s $GW/health` na data da entrega (ou nota de que o ambiente e efemero e como subir — ADR-0008)
- **Resultado esperado:** conforme

## Casos de Borda
- Video acima de 15 min: cortar CI/CD para o log de um run pronto; priorizar CPF e dashboard (maior peso)
- URL do gateway muda a cada `deploy-all`: no PDF, citar a URL da gravacao e o comando para reproduzir

## Rastreabilidade

| Criterio de Aceite | Cenarios |
|---|---|
| Autenticacao com CPF | TS-01 |
| Pipeline CI/CD | TS-02 |
| Deploy automatizado | TS-03 |
| APIs protegidas | TS-04 |
| Dashboard ao vivo | TS-05 |
| Logs e traces | TS-06 |
| Video <= 15 min publicado | TS-07 |
| PDF (repos, video, docs, confirmacao) | TS-08 |
| `soat-architecture` + `main` protegida + deploy ativo | TS-09 |

## Checklist de Validacao
- [x] Todos os criterios cobertos
- [x] Casos de borda documentados
- [x] Instrucoes claras

## Comandos Uteis
```bash
caffeinate -i scripts/aws-resume.sh   # repo infra-k8s — retoma o ambiente pausado em ~7 min
```
