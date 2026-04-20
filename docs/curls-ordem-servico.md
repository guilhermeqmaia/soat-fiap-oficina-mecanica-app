# CURLs — Modulo Ordem de Servico

> Base URL: `http://localhost:3000`
>
> Copie e cole diretamente no Insomnia (suporta import de cURL).
> Substitua os UUIDs de exemplo pelos IDs reais retornados pela API.
> Para requests autenticados, substitua `SUBSTITUIR_PELO_TOKEN` pelo token JWT válido.

---

## 1. Criar um Cliente (pré-requisito)

Antes de abrir uma OS, é necessário ter um cliente cadastrado.

```bash
curl -X POST http://localhost:3000/clientes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUBSTITUIR_PELO_TOKEN" \
  -d '{
    "nome": "Joao da Silva",
    "cpfCnpj": "52998224725",
    "telefone": "11999998888",
    "email": "joao@email.com"
  }'
```

> Anote o `id` retornado — ele será usado como `clienteId` nos próximos requests.

---

## 2. Criar um Veículo (pré-requisito)

Associe um veículo ao cliente antes de abrir a OS.

```bash
curl -X POST http://localhost:3000/veiculos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUBSTITUIR_PELO_TOKEN" \
  -d '{
    "placa": "ABC1D23",
    "marca": "Toyota",
    "modelo": "Corolla",
    "ano": 2024,
    "clienteId": "SUBSTITUIR_PELO_ID_DO_CLIENTE"
  }'
```

> Anote o `id` retornado — ele será usado como `veiculoId`.

---

## 3. POST /ordens-servico — Abrir Nova Ordem de Serviço

### 3.1 Abertura inicial (status RECEBIDA)

```bash
curl -X POST http://localhost:3000/ordens-servico \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUBSTITUIR_PELO_TOKEN" \
  -d '{
    "clienteId": "SUBSTITUIR_PELO_ID_DO_CLIENTE",
    "veiculoId": "SUBSTITUIR_PELO_ID_DO_VEICULO",
    "descricaoInicial": "Cliente relata barulho ao frenar e ar quente"
  }'
```

**Resposta esperada (201):**
```json
{
  "id": "uuid-da-os",
  "numero": "OS-2026-00001",
  "clienteId": "uuid-cliente",
  "veiculoId": "uuid-veiculo",
  "usuarioId": null,
  "descricaoInicial": "Cliente relata barulho ao frenar e ar quente",
  "diagnostico": null,
  "status": "RECEBIDA",
  "createdAt": "2026-04-18T10:00:00Z",
  "updatedAt": "2026-04-18T10:00:00Z"
}
```

> Anote o `id` retornado — ele será usado nos próximos requests.

---

## 4. GET /ordens-servico — Listar Todas as OS

### 4.1 Listagem simples (todas as OS)

```bash
curl -X GET http://localhost:3000/ordens-servico \
  -H "Authorization: Bearer SUBSTITUIR_PELO_TOKEN"
```

### 4.2 Com filtro por cliente

```bash
curl -X GET "http://localhost:3000/ordens-servico?clienteId=SUBSTITUIR_PELO_ID_DO_CLIENTE" \
  -H "Authorization: Bearer SUBSTITUIR_PELO_TOKEN"
```

### 4.3 Com filtro por status

```bash
curl -X GET "http://localhost:3000/ordens-servico?status=RECEBIDA" \
  -H "Authorization: Bearer SUBSTITUIR_PELO_TOKEN"
```

### 4.4 Com paginacao

```bash
curl -X GET "http://localhost:3000/ordens-servico?page=1&limit=10" \
  -H "Authorization: Bearer SUBSTITUIR_PELO_TOKEN"
```

**Resposta esperada (200):**
```json
{
  "data": [
    {
      "id": "uuid-da-os",
      "numero": "OS-2026-00001",
      "clienteId": "uuid-cliente",
      "veiculoId": "uuid-veiculo",
      "usuarioId": null,
      "descricaoInicial": "Cliente relata barulho ao frenar e ar quente",
      "diagnostico": null,
      "status": "RECEBIDA",
      "createdAt": "2026-04-18T10:00:00Z",
      "updatedAt": "2026-04-18T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

---

## 5. GET /ordens-servico/:id — Buscar OS por ID

```bash
curl -X GET http://localhost:3000/ordens-servico/SUBSTITUIR_PELO_ID_DA_OS \
  -H "Authorization: Bearer SUBSTITUIR_PELO_TOKEN"
```

---

## 6. POST /ordens-servico/:id/atribuir-mecanico — Atribuir Mecânico

Quando o mecânico se atribui à OS, o status muda para EM_DIAGNOSTICO.

```bash
curl -X POST http://localhost:3000/ordens-servico/SUBSTITUIR_PELO_ID_DA_OS/atribuir-mecanico \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUBSTITUIR_PELO_TOKEN" \
  -d '{
    "usuarioId": "SUBSTITUIR_PELO_ID_DO_MECANICO"
  }'
```

**Resposta esperada (200):**
```json
{
  "id": "uuid-da-os",
  "numero": "OS-2026-00001",
  "clienteId": "uuid-cliente",
  "veiculoId": "uuid-veiculo",
  "usuarioId": "uuid-mecanico",
  "descricaoInicial": "Cliente relata barulho ao frenar e ar quente",
  "diagnostico": null,
  "status": "EM_DIAGNOSTICO",
  "createdAt": "2026-04-18T10:00:00Z",
  "updatedAt": "2026-04-18T10:01:00Z"
}
```

---

## 7. POST /ordens-servico/:id/completar-diagnostico — Completar Diagnóstico

Quando o mecânico completa o diagnóstico, o status muda para AGUARDANDO_APROVACAO.

```bash
curl -X POST http://localhost:3000/ordens-servico/SUBSTITUIR_PELO_ID_DA_OS/completar-diagnostico \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUBSTITUIR_PELO_TOKEN" \
  -d '{
    "diagnostico": "Pastilhas de freio desgastadas. Compressor do ar-condicionado com vazamento. Recomenda-se troca de ambos."
  }'
```

**Resposta esperada (200):**
```json
{
  "id": "uuid-da-os",
  "numero": "OS-2026-00001",
  "clienteId": "uuid-cliente",
  "veiculoId": "uuid-veiculo",
  "usuarioId": "uuid-mecanico",
  "descricaoInicial": "Cliente relata barulho ao frenar e ar quente",
  "diagnostico": "Pastilhas de freio desgastadas. Compressor do ar-condicionado com vazamento. Recomenda-se troca de ambos.",
  "status": "AGUARDANDO_APROVACAO",
  "createdAt": "2026-04-18T10:00:00Z",
  "updatedAt": "2026-04-18T10:02:00Z"
}
```

---

## 8. POST /ordens-servico/:id/aprovar-orcamento — Aprovar Orçamento

Cliente aprova o orçamento, status muda para EM_EXECUCAO.

```bash
curl -X POST http://localhost:3000/ordens-servico/SUBSTITUIR_PELO_ID_DA_OS/aprovar-orcamento \
  -H "Authorization: Bearer SUBSTITUIR_PELO_TOKEN"
```

**Resposta esperada (200):**
```json
{
  "id": "uuid-da-os",
  "numero": "OS-2026-00001",
  "status": "EM_EXECUCAO",
  "...": "..."
}
```

---

## 9. POST /ordens-servico/:id/rejeitar-orcamento — Rejeitar Orçamento

Cliente rejeita o orçamento, status muda para CANCELADA.

```bash
curl -X POST http://localhost:3000/ordens-servico/SUBSTITUIR_PELO_ID_DA_OS/rejeitar-orcamento \
  -H "Authorization: Bearer SUBSTITUIR_PELO_TOKEN"
```

**Resposta esperada (200):**
```json
{
  "id": "uuid-da-os",
  "numero": "OS-2026-00001",
  "status": "CANCELADA",
  "...": "..."
}
```

---

## 10. POST /ordens-servico/:id/finalizar-execucao — Finalizar Execução

Mecânico finaliza a execução, status muda para FINALIZADA.

```bash
curl -X POST http://localhost:3000/ordens-servico/SUBSTITUIR_PELO_ID_DA_OS/finalizar-execucao \
  -H "Authorization: Bearer SUBSTITUIR_PELO_TOKEN"
```

**Resposta esperada (200):**
```json
{
  "id": "uuid-da-os",
  "numero": "OS-2026-00001",
  "status": "FINALIZADA",
  "...": "..."
}
```

---

## 11. POST /ordens-servico/:id/entregar — Entregar Veículo

Atendente entrega o veículo, status muda para ENTREGUE.

```bash
curl -X POST http://localhost:3000/ordens-servico/SUBSTITUIR_PELO_ID_DA_OS/entregar \
  -H "Authorization: Bearer SUBSTITUIR_PELO_TOKEN"
```

**Resposta esperada (200):**
```json
{
  "id": "uuid-da-os",
  "numero": "OS-2026-00001",
  "status": "ENTREGUE",
  "...": "..."
}
```

---

## 12. DELETE /ordens-servico/:id — Deletar OS

```bash
curl -X DELETE http://localhost:3000/ordens-servico/SUBSTITUIR_PELO_ID_DA_OS \
  -H "Authorization: Bearer SUBSTITUIR_PELO_TOKEN"
```

**Resposta esperada (204):**
```
Sem conteúdo
```

---

## Códigos de Erro

| Status | Descrição |
|--------|-----------|
| 201 | OS criada com sucesso |
| 200 | Operação realizada com sucesso |
| 204 | OS deletada com sucesso (sem conteúdo) |
| 400 | Dados inválidos ou transição de status inválida |
| 401 | Token ausente ou inválido |
| 403 | Role insuficiente (acesso negado) |
| 404 | Cliente, veículo ou OS não encontrado |
| 409 | Conflito (ex: veículo não pertence ao cliente) |
| 500 | Erro interno do servidor |

---

## Fluxo Completo de Teste

```bash
# 1. Criar cliente
CLIENTE_ID=$(curl -s -X POST http://localhost:3000/clientes ... | jq -r '.id')

# 2. Criar veículo
VEICULO_ID=$(curl -s -X POST http://localhost:3000/veiculos ... | jq -r '.id')

# 3. Abrir OS
OS_ID=$(curl -s -X POST http://localhost:3000/ordens-servico ... | jq -r '.id')

# 4. Atribuir mecânico
curl -s -X POST http://localhost:3000/ordens-servico/$OS_ID/atribuir-mecanico ...

# 5. Completar diagnóstico
curl -s -X POST http://localhost:3000/ordens-servico/$OS_ID/completar-diagnostico ...

# 6. Aprovar orçamento
curl -s -X POST http://localhost:3000/ordens-servico/$OS_ID/aprovar-orcamento ...

# 7. Finalizar execução
curl -s -X POST http://localhost:3000/ordens-servico/$OS_ID/finalizar-execucao ...

# 8. Entregar
curl -s -X POST http://localhost:3000/ordens-servico/$OS_ID/entregar ...
```
