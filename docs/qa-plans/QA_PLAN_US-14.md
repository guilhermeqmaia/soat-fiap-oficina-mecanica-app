# QA Plan — US-14: Execucao dos Servicos

Validacao manual do fluxo de execucao de servicos via Docker. Os cURLs deste documento usam `jq` para encadear as respostas — basta colar cada bloco em sequencia no mesmo terminal.

## Pre-requisitos

- Docker + Docker Compose instalados
- `jq` instalado (`brew install jq` no Mac, `sudo apt install jq` no Linux)
- `curl` (ja vem por padrao)
- Repositorio clonado e branch principal checada

## 1. Subir o ambiente

```bash
docker compose up -d --build
```

### Aguardar o app

```bash
until curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auth/login \
  -X POST -H 'Content-Type: application/json' -d '{}' | grep -qE "^(400|401)$"; do
  echo "Aguardando app subir..."
  sleep 2
done
echo "App no ar em http://localhost:3000"
```

## 2. Variaveis base

```bash
export API=http://localhost:3000
```

## 3. Autenticacao

```bash
ADMIN_TOKEN=$(curl -s -X POST $API/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@oficina.com","senha":"admin123"}' \
  | jq -r '.accessToken')

MECANICO_LOGIN=$(curl -s -X POST $API/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"mecanico@oficina.com","senha":"mecanico123"}')
MECANICO_TOKEN=$(echo "$MECANICO_LOGIN" | jq -r '.accessToken')
MECANICO_ID=$(echo "$MECANICO_LOGIN" | jq -r '.usuario.id')

echo "MECANICO_ID=$MECANICO_ID"
```

## 4. Cenario 1: Fluxo completo ponta a ponta (caminho feliz)

> **Criterio:** OS deve estar em EM_EXECUCAO para iniciar/concluir servicos; quando todos concluidos, status muda para FINALIZADA automaticamente.

### 4.1 — IDs do seed

```bash
CLIENTE_ID="11111111-1111-4111-8111-111111111111"
VEICULO_ID="aaaa1111-1111-4111-8111-111111111111"
SERVICO_A="5e111111-1111-4111-8111-111111111111"  # Troca de oleo R$ 150
SERVICO_B="5e222222-2222-4222-8222-222222222222"  # Alinhamento R$ 80
```

### 4.2 — Abrir OS

```bash
OS_RESPONSE=$(curl -s -X POST $API/ordens-servico \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"clienteId\": \"$CLIENTE_ID\",
    \"veiculoId\": \"$VEICULO_ID\",
    \"descricaoInicial\": \"Revisao completa do veiculo\"
  }")
OS_ID=$(echo "$OS_RESPONSE" | jq -r '.id')
echo "OS_ID=$OS_ID  status=$(echo $OS_RESPONSE | jq -r '.status')"
```

**Esperado:** `status="RECEBIDA"`

### 4.3 — Atribuir mecanico (RECEBIDA → EM_DIAGNOSTICO)

```bash
curl -s -X POST $API/ordens-servico/$OS_ID/atribuir-mecanico \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"usuarioId\": \"$MECANICO_ID\"}" | jq '.status'
```

**Esperado:** `"EM_DIAGNOSTICO"`

### 4.4 — Adicionar dois servicos

```bash
curl -s -X POST $API/ordens-servico/$OS_ID/servicos \
  -H "Authorization: Bearer $MECANICO_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"servicoId\": \"$SERVICO_A\", \"quantidade\": 1}" \
  | jq '.itensServico[0].statusExecucao'

curl -s -X POST $API/ordens-servico/$OS_ID/servicos \
  -H "Authorization: Bearer $MECANICO_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"servicoId\": \"$SERVICO_B\", \"quantidade\": 1}" \
  | jq '[.itensServico[].statusExecucao]'
```

**Esperado:** `"PENDENTE"` para ambos.

### 4.5 — Completar diagnostico (EM_DIAGNOSTICO → AGUARDANDO_APROVACAO)

```bash
curl -s -X POST $API/ordens-servico/$OS_ID/completar-diagnostico \
  -H "Authorization: Bearer $MECANICO_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"diagnostico": "Oleo e correia de distribuicao necessitam troca urgente."}' \
  | jq '.status'
```

**Esperado:** `"AGUARDANDO_APROVACAO"`

### 4.6 — Aprovar orcamento (AGUARDANDO_APROVACAO → EM_EXECUCAO)

```bash
curl -s -X POST $API/ordens-servico/$OS_ID/aprovar-orcamento \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.status'
```

**Esperado:** `"EM_EXECUCAO"`

### 4.7 — Iniciar execucao do primeiro servico

```bash
curl -s -X PATCH $API/ordens-servico/$OS_ID/servicos/$SERVICO_A/iniciar \
  -H "Authorization: Bearer $MECANICO_TOKEN" \
  | jq '.itensServico[] | select(.servicoId == "'$SERVICO_A'") | {statusExecucao, inicioExecucao}'
```

**Esperado:** `statusExecucao="EM_EXECUCAO"`, `inicioExecucao` preenchido com timestamp.

```bash
# Servico B ainda PENDENTE
curl -s -X GET $API/ordens-servico/$OS_ID \
  -H "Authorization: Bearer $MECANICO_TOKEN" \
  | jq '[.itensServico[] | {servicoId, statusExecucao}]'
```

**Esperado:** Servico A `EM_EXECUCAO`, Servico B `PENDENTE`. Status da OS continua `EM_EXECUCAO`.

### 4.8 — Iniciar execucao do segundo servico

```bash
curl -s -X PATCH $API/ordens-servico/$OS_ID/servicos/$SERVICO_B/iniciar \
  -H "Authorization: Bearer $MECANICO_TOKEN" \
  | jq '[.itensServico[] | {servicoId, statusExecucao}]'
```

**Esperado:** Ambos `EM_EXECUCAO`.

### 4.9 — Concluir o primeiro servico (OS permanece EM_EXECUCAO)

```bash
curl -s -X PATCH $API/ordens-servico/$OS_ID/servicos/$SERVICO_A/concluir \
  -H "Authorization: Bearer $MECANICO_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"horasTrabalhadas": 1.5}' \
  | jq '{status: .status, itens: [.itensServico[] | {servicoId, statusExecucao, horasTrabalhadas}]}'
```

**Esperado:** `status="EM_EXECUCAO"` (ainda ha servico pendente). Servico A com `statusExecucao="CONCLUIDO"`, `horasTrabalhadas=1.5`, `fimExecucao` preenchido.

### 4.10 — Concluir o segundo servico (dispara auto-finalizacao)

```bash
curl -s -X PATCH $API/ordens-servico/$OS_ID/servicos/$SERVICO_B/concluir \
  -H "Authorization: Bearer $MECANICO_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"horasTrabalhadas": 0.75}' \
  | jq '{status: .status, itens: [.itensServico[] | {servicoId, statusExecucao, horasTrabalhadas, fimExecucao}]}'
```

**Esperado:**
- `status="FINALIZADA"` (auto-finalizacao porque todos os servicos estao CONCLUIDOS)
- Ambos os servicos com `statusExecucao="CONCLUIDO"` e `fimExecucao` preenchido
- Notificacao `OS_FINALIZADA` deve aparecer nos logs do app

### 4.11 — Verificar persistencia no banco (opcional)

```bash
docker exec -it oficina_mecanica_db psql -U postgres -d oficina_mecanica \
  -c "SELECT servico_id, status_execucao, inicio_execucao, fim_execucao, horas_trabalhadas
      FROM item_ordem_de_servico_servico
      WHERE ordem_de_servico_id = '$OS_ID';"
```

**Esperado:** duas linhas com `status_execucao=CONCLUIDO`, timestamps e horas preenchidos.

## 5. Cenario 2: Erro ao iniciar servico fora do status EM_EXECUCAO

```bash
OS2_ID=$(curl -s -X POST $API/ordens-servico \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"clienteId\": \"$CLIENTE_ID\",
    \"veiculoId\": \"$VEICULO_ID\",
    \"descricaoInicial\": \"Teste status invalido\"
  }" | jq -r '.id')

curl -s -o /dev/null -w "%{http_code}\n" \
  -X PATCH $API/ordens-servico/$OS2_ID/servicos/$SERVICO_A/iniciar \
  -H "Authorization: Bearer $MECANICO_TOKEN"
```

**Esperado:** `400` — OS esta em `RECEBIDA`, nao `EM_EXECUCAO`.

## 6. Cenario 3: Erro ao tentar iniciar servico que ja esta EM_EXECUCAO

Usando a OS do Cenario 1 (ja finalizada — ou criar nova e levar ate EM_EXECUCAO):

```bash
# Servico A ja esta CONCLUIDO na OS do cenario 1; tentar iniciar de novo
curl -s -X PATCH $API/ordens-servico/$OS_ID/servicos/$SERVICO_A/iniciar \
  -H "Authorization: Bearer $MECANICO_TOKEN" \
  | jq '{statusCode, message}'
```

**Esperado:** `400` com mensagem indicando que a OS esta `FINALIZADA` (nao `EM_EXECUCAO`).

## 7. Cenario 4: Erro ao concluir servico PENDENTE (sem ter iniciado)

```bash
# Criar nova OS e levar ate EM_EXECUCAO
OS3_RESP=$(curl -s -X POST $API/ordens-servico \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"clienteId\": \"$CLIENTE_ID\",\"veiculoId\": \"$VEICULO_ID\",\"descricaoInicial\": \"Teste concluir sem iniciar\"}")
OS3_ID=$(echo "$OS3_RESP" | jq -r '.id')

curl -s -X POST $API/ordens-servico/$OS3_ID/atribuir-mecanico \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' -d "{\"usuarioId\": \"$MECANICO_ID\"}" > /dev/null

curl -s -X POST $API/ordens-servico/$OS3_ID/servicos \
  -H "Authorization: Bearer $MECANICO_TOKEN" \
  -H 'Content-Type: application/json' -d "{\"servicoId\": \"$SERVICO_A\", \"quantidade\": 1}" > /dev/null

curl -s -X POST $API/ordens-servico/$OS3_ID/completar-diagnostico \
  -H "Authorization: Bearer $MECANICO_TOKEN" \
  -H 'Content-Type: application/json' -d '{"diagnostico": "Diagnostico para teste de erro"}' > /dev/null

curl -s -X POST $API/ordens-servico/$OS3_ID/aprovar-orcamento \
  -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null

# Tentar concluir sem ter iniciado
curl -s -X PATCH $API/ordens-servico/$OS3_ID/servicos/$SERVICO_A/concluir \
  -H "Authorization: Bearer $MECANICO_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"horasTrabalhadas": 1}' \
  | jq '{statusCode, message}'
```

**Esperado:** `400` — item esta `PENDENTE`, precisa ser iniciado antes de concluir.

## 8. Cenario 5: Erro de validacao — horas trabalhadas invalidas

```bash
# Usando OS3_ID do cenario anterior (servico ainda PENDENTE)
# Primeiro iniciar
curl -s -X PATCH $API/ordens-servico/$OS3_ID/servicos/$SERVICO_A/iniciar \
  -H "Authorization: Bearer $MECANICO_TOKEN" > /dev/null

# Tentar concluir com horas = 0
curl -s -X PATCH $API/ordens-servico/$OS3_ID/servicos/$SERVICO_A/concluir \
  -H "Authorization: Bearer $MECANICO_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"horasTrabalhadas": 0}' \
  | jq '{statusCode, message}'
```

**Esperado:** `400` — validacao do DTO rejeita `horasTrabalhadas <= 0`.

## 9. Cenario 6: Protecao de roles

```bash
# Atendente nao pode iniciar/concluir servico
ATENDENTE_TOKEN=$(curl -s -X POST $API/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"atendente@oficina.com","senha":"atendente123"}' \
  | jq -r '.accessToken')

curl -s -o /dev/null -w "%{http_code}\n" \
  -X PATCH $API/ordens-servico/$OS_ID/servicos/$SERVICO_A/iniciar \
  -H "Authorization: Bearer $ATENDENTE_TOKEN"
```

**Esperado:** `403`

```bash
# Sem token
curl -s -o /dev/null -w "%{http_code}\n" \
  -X PATCH $API/ordens-servico/$OS_ID/servicos/$SERVICO_A/iniciar
```

**Esperado:** `401`

## 10. Cenario 7: Servico nao pertence a OS

```bash
SERVICO_INEXISTENTE="00000000-0000-0000-0000-000000000099"

curl -s -X PATCH $API/ordens-servico/$OS3_ID/servicos/$SERVICO_INEXISTENTE/iniciar \
  -H "Authorization: Bearer $MECANICO_TOKEN" \
  | jq '{statusCode, message}'
```

**Esperado:** `404`

## 11. Limpeza

```bash
docker compose down            # mantem volume
docker compose down -v         # remove volume (zera banco)
```

## Traceability

| Criterio de aceite | Cenario(s) |
|---|---|
| `PATCH /ordens-servico/:id/servicos/:servicoId/iniciar` disponivel | 4.7 |
| `PATCH /ordens-servico/:id/servicos/:servicoId/concluir` disponivel | 4.9, 4.10 |
| OS deve estar em `EM_EXECUCAO` | 5 |
| Registrar horas trabalhadas por servico | 4.9, 4.10, 4.11 |
| Quando todos servicos concluidos, status muda para `FINALIZADA` automaticamente | 4.10 |
| Protecao de roles (apenas ADMIN/MECANICO) | 9 |
| Erro ao concluir servico sem ter iniciado | 7 |
| Erro ao iniciar servico ja em execucao ou concluido | 6 |
| Validacao de horas trabalhadas | 8 |

## Checklist de validacao

- [ ] `docker compose up -d --build` sobe os 4 containers (db, app, web-admin, web-cliente) sem erro
- [ ] Migration `20260427000000_add_execucao_item_servico` foi aplicada (verificavel no log do app)
- [ ] Cenario 4: fluxo completo funciona; `statusExecucao` evolui `PENDENTE -> EM_EXECUCAO -> CONCLUIDO`
- [ ] Cenario 4.10: apos ultimo servico concluido, `status` da OS muda para `FINALIZADA` automaticamente
- [ ] Cenario 4.11: banco persiste `inicio_execucao`, `fim_execucao` e `horas_trabalhadas`
- [ ] Cenario 5: `400` ao tentar iniciar em OS fora de `EM_EXECUCAO`
- [ ] Cenario 7: `400` ao concluir servico que esta `PENDENTE`
- [ ] Cenario 8: `400` ao enviar `horasTrabalhadas=0`
- [ ] Cenario 9: `403` para role sem permissao, `401` sem token
- [ ] Cenario 10: `404` para servico nao pertencente a OS

## Edge cases adicionais (cobertos por testes unitarios)

| Cenario | Comportamento esperado | Arquivo |
|---|---|---|
| Tentar iniciar servico `CONCLUIDO` | `400 ItemServicoInvalidStatusError` | `ordem-de-servico.entity.spec.ts` |
| Concluir com `horasTrabalhadas` negativo | `400 Error` | `ordem-de-servico.entity.spec.ts` |
| OS com unico servico: concluir dispara `FINALIZADA` | status auto-transiciona | `ordem-de-servico.entity.spec.ts` |
| `concluirServico` emite `OsFinalizadaEvent` quando finaliza | evento emitido | `ordem-de-servico.service.spec.ts` |
| `concluirServico` NAO emite evento quando servicos restantes | evento nao emitido | `ordem-de-servico.service.spec.ts` |
| Repositorio persiste todos os campos de execucao | campos no banco | `prisma-ordem-de-servico.repository.integration.spec.ts` |
