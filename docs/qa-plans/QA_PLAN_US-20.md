# QA Plan — US-20: Notificacao ao Cliente

Validacao manual do modulo de notificacao via Docker. Os cURLs deste documento usam `jq` para encadear as respostas — basta colar cada bloco em sequencia no mesmo terminal, sem precisar editar IDs ou tokens.

## Pre-requisitos

- Docker + Docker Compose instalados
- `jq` instalado (`brew install jq` no Mac, `sudo apt install jq` no Linux)
- `curl` (ja vem por padrao)
- Repositorio clonado e branch `us-20-implement-notification-system` checada
- `.env` com `JWT_SECRET` e `PUBLIC_BASE_URL` (copie de `.env.example` se ainda nao existir). `PUBLIC_BASE_URL=http://localhost:3000` eh o default e cai bem para o teste local.

```bash
git checkout us-20-implement-notification-system
```

## 1. Subir o ambiente

A partir da raiz do projeto:

```bash
docker compose up -d --build
```

O compose sobe os containers do sistema (db, app, web-admin, web-cliente); os relevantes para este teste sao:
- `oficina_mecanica_db` — Postgres 16 (porta `5432`)
- `oficina_mecanica_app` — API Nest (porta `3000`)

O `entrypoint` do app ja roda `npx prisma migrate deploy` antes de iniciar, entao a tabela `notificacao` (criada pela migration `20260426170000_add_notificacao`) e os seeds de usuarios/clientes/veiculos/servicos sao aplicados automaticamente.

### Aguardar o app ficar saudavel

```bash
until curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auth/login -X POST -H 'Content-Type: application/json' -d '{}' | grep -qE "^(400|401)$"; do
  echo "Aguardando app subir..."
  sleep 2
done
echo "App no ar em http://localhost:3000"
```

> O `400/401` indica que o endpoint respondeu (a request esta vazia, mas a aplicacao ja esta de pe).

### Stream de logs (terminal separado)

Em **outro terminal**, deixe rodando para ver o mock de email sendo "enviado":

```bash
docker compose logs -f app | grep -E "MOCK EMAIL|Notificacao"
```

## 2. Variaveis base

No terminal principal:

```bash
export API=http://localhost:3000
```

## 3. Cenario 1: Notificacao quando o orcamento estiver pronto

> **Criterio:** "Enviar notificacao quando orcamento estiver pronto (Policy)"

### 3.1 — Login como admin (token para criar OS, atribuir mecanico, etc.)

```bash
ADMIN_TOKEN=$(curl -s -X POST $API/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@oficina.com","senha":"admin123"}' \
  | jq -r '.accessToken')
echo "ADMIN_TOKEN=${ADMIN_TOKEN:0:20}..."
```

### 3.2 — Login como mecanico (precisa do `id` do mecanico para atribuir)

```bash
MECANICO_LOGIN=$(curl -s -X POST $API/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"mecanico@oficina.com","senha":"mecanico123"}')
MECANICO_TOKEN=$(echo "$MECANICO_LOGIN" | jq -r '.accessToken')
MECANICO_ID=$(echo "$MECANICO_LOGIN" | jq -r '.usuario.id')
echo "MECANICO_ID=$MECANICO_ID"
```

### 3.3 — Criar a OS (cliente Joao da Silva, veiculo Fiat Uno — ambos do seed)

```bash
CLIENTE_ID="11111111-1111-4111-8111-111111111111"  # Joao da Silva (email: dono@oficina.com)
VEICULO_ID="aaaa1111-1111-4111-8111-111111111111"  # Fiat Uno placa ABC1D23

OS_RESPONSE=$(curl -s -X POST $API/ordens-servico \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"clienteId\": \"$CLIENTE_ID\",
    \"veiculoId\": \"$VEICULO_ID\",
    \"descricaoInicial\": \"Cliente relata barulho ao frenar\"
  }")
OS_ID=$(echo "$OS_RESPONSE" | jq -r '.id')
OS_NUMERO=$(echo "$OS_RESPONSE" | jq -r '.numero')
echo "OS_ID=$OS_ID  numero=$OS_NUMERO"
```

### 3.4 — Atribuir o mecanico (RECEBIDA → EM_DIAGNOSTICO)

```bash
curl -s -X POST $API/ordens-servico/$OS_ID/atribuir-mecanico \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"usuarioId\": \"$MECANICO_ID\"}" | jq '.status'
```

**Esperado:** `"EM_DIAGNOSTICO"`

### 3.5 — Adicionar um servico (Troca de oleo, do seed)

```bash
SERVICO_ID="5e111111-1111-4111-8111-111111111111"  # Troca de oleo, R$ 150

curl -s -X POST $API/ordens-servico/$OS_ID/servicos \
  -H "Authorization: Bearer $MECANICO_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"servicoId\": \"$SERVICO_ID\", \"quantidade\": 1}" | jq '.itensServico'
```

### 3.6 — Completar diagnostico → DISPARA NOTIFICACAO #1

```bash
curl -s -X POST $API/ordens-servico/$OS_ID/completar-diagnostico \
  -H "Authorization: Bearer $MECANICO_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"diagnostico": "Pastilhas de freio desgastadas. Necessario trocar."}' \
  | jq '{status, diagnostico}'
```

**Esperado:** `status="AGUARDANDO_APROVACAO"`

> **No terminal de logs** voce deve ver algo como:
> ```
> [MockEmailNotificador] [MOCK EMAIL] to=do**@oficina.com subject="Orcamento da OS OS-2026-... pronto para aprovacao" bodyLength=412
> ```
>
> O log mostra apenas **destinatario mascarado**, **assunto** e **tamanho do corpo** (sem o conteudo). Para inspecionar a mensagem completa, use o endpoint `GET /notificacoes` ou consulte direto na tabela `notificacao`. Isso evita vazar PII (nome, email completo, diagnostico) em logs de producao.

### 3.7 — Validar registro no historico de notificacoes

```bash
curl -s "$API/notificacoes?ordemDeServicoId=$OS_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.data[] | {tipo, canal, destinatario, assunto, status, mensagem}'
```

**Esperado:** uma entrada com `tipo=ORCAMENTO_PRONTO`, `canal=EMAIL`, `destinatario=dono@oficina.com`, `status=ENVIADA`, e a `mensagem` contendo as instrucoes de aprovar/rejeitar com URLs absolutas (`http://localhost:3000/ordens-servico/{id}/aprovar-orcamento`).

> **Nota sobre o status:** notificacoes nascem como `PENDENTE` na entity e so transitam para `ENVIADA` ou `FALHOU` apos o `Notificador` ser invocado. Em condicoes normais voce nunca ve `PENDENTE` aqui (o registro so eh persistido apos a transicao). Se aparecer, eh sintoma de bug.

## 4. Cenario 2: Notificacao quando OS for finalizada (= veiculo pronto para retirada)

> **Criterios:** "Enviar notificacao quando OS for finalizada" + "Enviar notificacao quando veiculo estiver pronto para retirada" — ambos satisfeitos pelo mesmo evento `OsFinalizadaEvent` (no state machine, `FINALIZADA` = pronto para retirada; `ENTREGUE` = ja entregue).

> Continua usando `$OS_ID` do Cenario 1.

### 4.1 — Aprovar o orcamento (AGUARDANDO_APROVACAO → EM_EXECUCAO)

```bash
curl -s -X POST $API/ordens-servico/$OS_ID/aprovar-orcamento \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.status'
```

**Esperado:** `"EM_EXECUCAO"`

### 4.2 — Finalizar a execucao → DISPARA NOTIFICACAO #2

```bash
curl -s -X POST $API/ordens-servico/$OS_ID/finalizar-execucao \
  -H "Authorization: Bearer $MECANICO_TOKEN" | jq '.status'
```

**Esperado:** `"FINALIZADA"`

> **No terminal de logs:**
> ```
> [MockEmailNotificador] [MOCK EMAIL] to=do**@oficina.com subject="OS OS-2026-... finalizada - veiculo pronto para retirada" bodyLength=187
> ```

### 4.3 — Validar as 2 notificacoes no historico desta OS

```bash
curl -s "$API/notificacoes?ordemDeServicoId=$OS_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '{total, tipos: [.data[].tipo]}'
```

**Esperado:** `total=2`, `tipos=["OS_FINALIZADA","ORCAMENTO_PRONTO"]`

## 5. Cenario 3: Cliente sem email — notificacao NAO eh tentada

> **Comportamento:** quando o cliente nao tem email cadastrado, o listener loga warning e nao registra notificacao (o sistema nao tenta enviar para nada). Diferente de "tentou e falhou".

### 5.1 — Cadastrar um cliente sem email

```bash
CLIENTE_SEM_EMAIL_RESPONSE=$(curl -s -X POST $API/clientes \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "nome": "Cliente Sem Email",
    "cpfCnpj": "98765432100",
    "telefone": "11988887777"
  }')
CLIENTE_SE_ID=$(echo "$CLIENTE_SEM_EMAIL_RESPONSE" | jq -r '.id')
echo "CLIENTE_SE_ID=$CLIENTE_SE_ID"
```

### 5.2 — Cadastrar um veiculo para esse cliente

```bash
VEICULO_SE_RESPONSE=$(curl -s -X POST $API/veiculos \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"placa\": \"SEM1E23\",
    \"marca\": \"Ford\",
    \"modelo\": \"Ka\",
    \"ano\": 2017,
    \"clienteId\": \"$CLIENTE_SE_ID\"
  }")
VEICULO_SE_ID=$(echo "$VEICULO_SE_RESPONSE" | jq -r '.id')
echo "VEICULO_SE_ID=$VEICULO_SE_ID"
```

### 5.3 — Repetir o fluxo (criar OS, atribuir, servico, completar diagnostico)

```bash
OS_SE_ID=$(curl -s -X POST $API/ordens-servico \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"clienteId\": \"$CLIENTE_SE_ID\",
    \"veiculoId\": \"$VEICULO_SE_ID\",
    \"descricaoInicial\": \"Cliente sem email - revisao\"
  }" | jq -r '.id')

curl -s -X POST $API/ordens-servico/$OS_SE_ID/atribuir-mecanico \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"usuarioId\": \"$MECANICO_ID\"}" > /dev/null

curl -s -X POST $API/ordens-servico/$OS_SE_ID/servicos \
  -H "Authorization: Bearer $MECANICO_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"servicoId\": \"$SERVICO_ID\", \"quantidade\": 1}" > /dev/null

curl -s -X POST $API/ordens-servico/$OS_SE_ID/completar-diagnostico \
  -H "Authorization: Bearer $MECANICO_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"diagnostico": "Necessario trocar oleo"}' | jq '.status'
```

### 5.4 — Validar que NAO houve registro

```bash
curl -s "$API/notificacoes?ordemDeServicoId=$OS_SE_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.total'
```

**Esperado:** `0`

> Nos logs deve aparecer:
> ```
> [OrdemDeServicoNotificacaoListener] Cliente <uuid> sem email; notificacao de orcamento da OS OS-2026-... nao sera enviada
> ```

## 6. Cenario 4: Listagem paginada / filtros

### 6.1 — Total geral

```bash
curl -s "$API/notificacoes?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '{total, page, limit, count: (.data | length)}'
```

### 6.2 — Filtrando por cliente

```bash
curl -s "$API/notificacoes?clienteId=$CLIENTE_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '{total, tipos: [.data[].tipo]}'
```

## 7. Cenario 5: Endpoint protegido por role

Mecanico nao tem acesso ao historico (apenas ADMIN/ATENDENTE):

```bash
curl -s -o /dev/null -w "%{http_code}\n" $API/notificacoes \
  -H "Authorization: Bearer $MECANICO_TOKEN"
```

**Esperado:** `403`

Sem token:

```bash
curl -s -o /dev/null -w "%{http_code}\n" $API/notificacoes
```

**Esperado:** `401`

## 8. Verificacao direta no banco (opcional)

```bash
docker exec -it oficina_mecanica_db psql -U postgres -d oficina_mecanica \
  -c "SELECT tipo, canal, status, destinatario, assunto, created_at FROM notificacao ORDER BY created_at DESC LIMIT 10;"
```

## 9. Cleanup

```bash
docker compose down            # mantem volume (dados persistem)
docker compose down -v         # remove volume (zera o banco)
```

## Edge cases adicionais (cobertos por testes unitarios)

| Cenario | Comportamento esperado | Onde validar |
|---|---|---|
| Notificador lanca exception (ex: SMTP down) | Persiste com `status=FALHOU` e `erro` preenchido. Fluxo principal nao quebra. | `notificacao.service.spec.ts` |
| Canal sem notificador registrado | Persiste com `status=FALHOU` e mensagem "Nenhum notificador..." | `notificacao.service.spec.ts` |
| Listener falha ao buscar cliente | Erro engolido (logger.error). Fluxo principal nao quebra. | `ordem-de-servico.listener.spec.ts` |

## Traceability

| Criterio de aceite | Cenario(s) |
|---|---|
| Enviar notificacao quando orcamento estiver pronto (Policy) | 3 |
| Enviar notificacao quando OS for finalizada | 4 |
| Enviar notificacao quando veiculo estiver pronto para retirada | 4 (mesmo evento) |
| Mecanismo extensivel (email como MVP) | 3.6, 4.2 (logs) + arquitetura `Notificador` port |
| Registrar historico de notificacoes enviadas | 3.7, 4.3, 6, 8 |
| Nao bloquear fluxo principal se notificacao falhar | 5 (cliente sem email) + edge cases |

## Checklist de validacao

- [ ] `docker compose up -d --build` sobe os 4 containers (db, app, web-admin, web-cliente) sem erro
- [ ] Migration `20260426170000_add_notificacao` foi aplicada (verificavel no log do app no boot)
- [ ] Cenario 3: notificacao `ORCAMENTO_PRONTO` aparece nos logs e no `GET /notificacoes`
- [ ] Cenario 4: notificacao `OS_FINALIZADA` aparece nos logs e no `GET /notificacoes`
- [ ] Cenario 5: cliente sem email NAO gera registro de notificacao (apenas warning no log)
- [ ] Cenario 7: roles (`MECANICO` recebe 403, sem token recebe 401)
- [ ] Mensagens de notificacao incluem instrucao do endpoint correto (`aprovar-orcamento` / `rejeitar-orcamento` para orcamento; `numero/{n}/status` para finalizacao) com **URL absoluta** baseada em `PUBLIC_BASE_URL`
- [ ] Log do `MockEmailNotificador` mostra destinatario **mascarado** (ex: `do**@oficina.com`), nao o email completo
