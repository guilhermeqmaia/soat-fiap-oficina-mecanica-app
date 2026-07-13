# QA Plan — US-18: Controle de Estoque

Validacao manual do controle de estoque, movimentacoes e alerta de estoque baixo.
Os cURLs deste documento usam `jq` para encadear as respostas — basta colar cada bloco em sequencia no mesmo terminal.

> **Nota sobre a US:** essa PR entrega a **Fase A** — infraestrutura completa de movimentacoes, endpoints de entrada/saida manual, dominio event de estoque baixo e UI no admin. Os criterios "reservar/baixar ao adicionar produtos na OS" e "estornar reserva se OS cancelada" dependem da **US-10** (produtos vinculados a OS) que ainda nao foi mergeada — quando ela chegar, basta plugar `produtoService.reserveStock(id, qty, { ordemDeServicoId })` nos pontos certos do fluxo da OS (mecanismo ja existe, conforme cobertura de teste unitario `deductStock` / `reserveStock` aceitando `ctx`).

## Pre-requisitos

- Docker + Docker Compose
- `jq` instalado
- `.env` com `JWT_SECRET` e demais variaveis (copiar de `.env.example`)
- Branch checada com a US-18 implementada

## 1. Subir o ambiente

```bash
docker compose down -v
docker compose up -d --build
```

Aguardar:

```bash
until curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auth/login -X POST -H 'Content-Type: application/json' -d '{}' | grep -qE "^(400|401)$"; do
  echo "Aguardando app..."
  sleep 2
done
echo "App no ar"
```

## 2. Variaveis base

```bash
export API=http://localhost:3000

ADMIN_TOKEN=$(curl -s -X POST $API/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@oficina.com","senha":"admin123"}' | jq -r '.accessToken')

# Produto seedado: Filtro de oleo (estoque 30, minimo 5)
PRODUTO_ID="9d111111-1111-4111-8111-111111111111"
echo "ADMIN_TOKEN ok | PRODUTO_ID=$PRODUTO_ID"
```

## 3. Cenario 1: Entrada de estoque com motivo registra movimentacao

> **Criterio:** `POST /produtos/:id/entrada — registrar entrada de estoque`

### 3.1 — Estado inicial

```bash
curl -s "$API/produtos/$PRODUTO_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '{nome, quantidadeEstoque, quantidadeReservada, quantidadeDisponivel, estoqueMinimo, alertaEstoqueBaixo}'
```

**Esperado:** `quantidadeEstoque: 30`, `alertaEstoqueBaixo: false`.

### 3.2 — Registrar entrada de 20 unidades com motivo

```bash
curl -s -X POST $API/produtos/$PRODUTO_ID/entrada \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"quantidade": 20, "motivo": "Compra fornecedor X - NF 12345"}' \
  | jq '{quantidadeEstoque, quantidadeDisponivel}'
```

**Esperado:** `quantidadeEstoque: 50`.

### 3.3 — Validar movimentacao registrada

```bash
curl -s "$API/produtos/$PRODUTO_ID/movimentacoes?limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.data[] | {tipo, quantidade, estoqueResultante, motivo, usuarioId, createdAt}'
```

**Esperado:** ultima entrada com `tipo: "ENTRADA"`, `quantidade: 20`, `estoqueResultante: 50`, `motivo` preenchido, `usuarioId` do admin.

## 4. Cenario 2: Saida manual com validacao de quantidade

### 4.1 — Saida valida (3 unidades)

```bash
curl -s -X POST $API/produtos/$PRODUTO_ID/saida \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"quantidade": 3, "motivo": "Perda - produto vencido"}' \
  | jq '{quantidadeEstoque}'
```

**Esperado:** `quantidadeEstoque: 47`.

### 4.2 — Saida que excede o disponivel deve falhar

```bash
curl -s -X POST $API/produtos/$PRODUTO_ID/saida \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"quantidade": 9999}' -w "\nHTTP %{http_code}\n"
```

**Esperado:** HTTP `409` (ConflictException) com mensagem "Estoque insuficiente para ...: solicitado ..., disponivel ...". O estoque **nao** muda.

### 4.3 — Confirmar que estoque continua intacto

```bash
curl -s "$API/produtos/$PRODUTO_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.quantidadeEstoque'
```

**Esperado:** `47` (mesmo valor de 4.1).

## 5. Cenario 3: Reserva e estorno de reserva

### 5.1 — Reservar 5 unidades vinculadas a uma OS ficticia

```bash
curl -s -X POST $API/produtos/$PRODUTO_ID/reservar \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"quantidade": 5}' \
  | jq '{quantidadeEstoque, quantidadeReservada, quantidadeDisponivel}'
```

**Esperado:** `quantidadeEstoque: 47`, `quantidadeReservada: 5`, `quantidadeDisponivel: 42`.

### 5.2 — Liberar a reserva (estorno)

```bash
curl -s -X POST $API/produtos/$PRODUTO_ID/liberar \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"quantidade": 5}' \
  | jq '{quantidadeEstoque, quantidadeReservada, quantidadeDisponivel}'
```

**Esperado:** `quantidadeReservada: 0`, `quantidadeDisponivel: 47`.

### 5.3 — Validar que ambas geraram movimentacoes (RESERVA e ESTORNO_RESERVA)

```bash
curl -s "$API/produtos/$PRODUTO_ID/movimentacoes?limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '[.data[] | {tipo, quantidade, estoqueResultante}] | .[0:4]'
```

**Esperado:** as 2 mais recentes sao `ESTORNO_RESERVA` e `RESERVA` (em ordem decrescente de criacao). `estoqueResultante` permanece `47` em ambas (so reserva nao mexe no estoque fisico).

## 6. Cenario 4: Alerta de estoque baixo (Domain Event)

> **Criterio:** "Alerta quando quantidade atingir estoque minimo (Domain Event)"

### 6.1 — Em outro terminal, capturar logs do app

```bash
docker compose logs -f app 2>&1 | grep --line-buffered -iE "estoque|baixo" > /tmp/estoque.log &
echo "Log capture PID=$!"
```

### 6.2 — Forcar saidas ate o estoque cair abaixo do minimo

Estoque atual: 47. Minimo: 5. Vamos derrubar pra 4.

```bash
# Saida de 43 unidades para deixar estoque em 4
curl -s -X POST $API/produtos/$PRODUTO_ID/saida \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"quantidade": 43, "motivo": "Forcando estoque baixo para teste"}' \
  | jq '{quantidadeEstoque, alertaEstoqueBaixo}'
```

**Esperado:** `quantidadeEstoque: 4`, `alertaEstoqueBaixo: true`.

### 6.3 — Verificar lista de produtos com estoque baixo

```bash
curl -s "$API/produtos/estoque-baixo" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.[] | {nome, quantidadeEstoque, estoqueMinimo, alertaEstoqueBaixo}'
```

**Esperado:** o produto Filtro de oleo aparece na lista.

> **Sobre o Domain Event:** o `EstoqueBaixoEvent` eh emitido via `@nestjs/event-emitter`. Sem listener registrado nesta PR ele apenas circula no event bus (visivel via debug se necessario). A confirmacao funcional eh: a query `/produtos/estoque-baixo` retorna o produto, e o badge aparece no admin.

### 6.4 — Restaurar estoque

```bash
curl -s -X POST $API/produtos/$PRODUTO_ID/entrada \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"quantidade": 50, "motivo": "Reposicao apos teste"}' \
  | jq '{quantidadeEstoque, alertaEstoqueBaixo}'
```

**Esperado:** `quantidadeEstoque: 54`, `alertaEstoqueBaixo: false`. O produto sai da lista de estoque baixo.

## 7. Cenario 5: Historico paginado e filtros

### 7.1 — Total geral de movimentacoes do produto

```bash
curl -s "$API/produtos/$PRODUTO_ID/movimentacoes?page=1&limit=50" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '{total, count: (.data | length)}'
```

**Esperado:** `total >= 7` (todos os movimentos dos cenarios 3 a 6).

### 7.2 — Filtrar so ENTRADAs

```bash
curl -s "$API/produtos/$PRODUTO_ID/movimentacoes?tipo=ENTRADA" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '{total, tipos: [.data[].tipo] | unique}'
```

**Esperado:** `tipos: ["ENTRADA"]` apenas.

### 7.3 — Filtrar so SAIDAs

```bash
curl -s "$API/produtos/$PRODUTO_ID/movimentacoes?tipo=SAIDA" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '{total, tipos: [.data[].tipo] | unique}'
```

**Esperado:** `tipos: ["SAIDA"]`.

## 8. Cenario 6: Permissoes (RBAC)

### 8.1 — Mecanico NAO pode registrar entrada

```bash
MECANICO_TOKEN=$(curl -s -X POST $API/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"mecanico@oficina.com","senha":"mecanico123"}' | jq -r '.accessToken')

curl -s -o /dev/null -w "%{http_code}\n" -X POST $API/produtos/$PRODUTO_ID/entrada \
  -H "Authorization: Bearer $MECANICO_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"quantidade": 5}'
```

**Esperado:** `403`.

### 8.2 — Mecanico **pode** ver movimentacoes (so leitura)

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "$API/produtos/$PRODUTO_ID/movimentacoes" \
  -H "Authorization: Bearer $MECANICO_TOKEN"
```

**Nota:** o controller restringe leitura a ADMIN, ATENDENTE, ESTOQUISTA — mecanico recebe `403`. Se for relevante incluir mecanico, adicionar `Role.MECANICO` no decorator do endpoint.

### 8.3 — Sem token

```bash
curl -s -o /dev/null -w "%{http_code}\n" $API/produtos/estoque-baixo
```

**Esperado:** `401`.

## 9. Cenario 7: Validacao no admin (frontend)

### 9.1 — Lista de produtos com estoque baixo destacado

1. Login no admin (`http://localhost:8080`) com `admin@oficina.com / admin123`
2. Menu lateral → **Produtos / Estoque**
3. Marcar checkbox **"Apenas estoque baixo"**

**Esperado:** lista filtra para mostrar so produtos com `quantidade <= minimo`. Cada linha tem badge `estoque baixo` ao lado do nome.

### 9.2 — Modal de entrada com motivo

1. Numa linha qualquer, clicar **+ Entrada**
2. Modal abre mostrando estoque/reservada/disponivel atual
3. Quantidade `10`, motivo `Compra fornecedor TestPlan`
4. **Confirmar**

**Esperado:** toast `Entrada registrada`. Lista atualiza com novo `quantidadeEstoque`.

### 9.3 — Pagina de movimentacoes

1. Na linha do produto, clicar **Movs.**

**Esperado:**
- Header com cards: Estoque, Reservado, Disponivel, Minimo (com badge se baixo)
- Tabela de movimentacoes ordenada por data desc
- Cada linha mostra tipo (badge colorido), quantidade com sinal `+/-/~`, estoque resultante e motivo
- Filtro por tipo funciona

### 9.4 — Dashboard mostra produtos com estoque baixo

1. Voltar para o **Dashboard** no menu

**Esperado:** card **"Estoque baixo"** lista os produtos abaixo do minimo (ate 8 visiveis, com link "Ver todos os N" se houver mais). Cada item linka pra `/produtos/:id/movimentacoes`.

## 10. Verificacao direta no banco (opcional)

```bash
docker exec -it oficina_mecanica_db psql -U postgres -d oficina_mecanica \
  -c "SELECT tipo, quantidade, estoque_resultante, motivo, created_at
      FROM movimentacao_estoque
      WHERE produto_id='9d111111-1111-4111-8111-111111111111'
      ORDER BY created_at DESC LIMIT 10;"
```

## 11. Cleanup

```bash
kill $(jobs -p) 2>/dev/null
docker compose down -v
rm -f /tmp/estoque.log
```

## Edge cases adicionais (cobertos por testes unitarios)

| Cenario | Esperado | Onde validar |
|---|---|---|
| Quantidade <= 0 ao criar movimentacao | erro `Quantidade da movimentacao deve ser positiva` | `movimentacao-estoque.entity.spec.ts` |
| Estoque resultante negativo | erro `Estoque resultante nao pode ser negativo` | `movimentacao-estoque.entity.spec.ts` |
| RESERVA nao emite EstoqueBaixoEvent | apenas BAIXA/SAIDA emitem | `produto.service.spec.ts` |
| Produto sem ID nao consegue gerar movimentacao | NotFoundException | `produto.service.spec.ts` |
| `findLowStock` ignora produtos inativos | retorna so ativos com `estoque <= minimo` | `produto.service.spec.ts` |

## Traceability — criterios de aceite

| Criterio | Fase | Cenario(s) | Status |
|---|---|---|---|
| `POST /produtos/:id/entrada` registrar entrada | A | 3 | ✅ |
| Reservar produtos ao adicionar na OS (automatico) | **B** | — | ⏳ aguarda US-10 |
| Dar baixa ao iniciar execucao do servico (Policy v3) | **B** | — | ⏳ aguarda US-10 |
| Estornar reserva se OS cancelada/rejeitada | **B** | — | ⏳ aguarda US-10 |
| Alerta quando atingir estoque minimo (Domain Event) | A | 6 | ✅ |
| Historico de movimentacoes de estoque | A | 3.3, 5.3, 7 | ✅ |
| Testes unitarios para regras de estoque | A | suite completa | ✅ 644/644 passando |

## Checklist de validacao

- [ ] `docker compose up -d --build` sobe os 4 containers (db, app, web-admin, web-cliente) sem erro
- [ ] Migration `20260427200000_add_movimentacao_estoque` aplicada
- [ ] Cenario 3: entrada com motivo persistida em `movimentacao_estoque` com tipo `ENTRADA`
- [ ] Cenario 4: saida que excede disponivel rejeita com 409 e nao altera estoque
- [ ] Cenario 5: reserva/liberar geram tipos distintos (`RESERVA` / `ESTORNO_RESERVA`) e nao mexem em `quantidadeEstoque`
- [ ] Cenario 6: alerta de estoque baixo aparece em `/produtos/estoque-baixo` e some quando estoque eh reposto
- [ ] Cenario 7: filtros de tipo na listagem de movimentacoes funcionam
- [ ] Cenario 8: roles (MECANICO recebe 403 para mutacoes; sem token recebe 401)
- [ ] Cenario 9 (frontend): badge "estoque baixo" aparece na lista, modal de entrada funcional, pagina de movimentacoes mostra historico, dashboard exibe card de estoque baixo
- [ ] Suite de testes unitarios passando (`npm run test:unit`): **644/644**
