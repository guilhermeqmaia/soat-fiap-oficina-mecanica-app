# CURLs — Modulo Veiculo

> Base URL: `http://localhost:3000`
>
> Copie e cole diretamente no Insomnia (suporta import de cURL).
> Substitua os UUIDs de exemplo pelos IDs reais retornados pela API.
>
> **Autenticação:** todos os endpoints exigem `Authorization: Bearer <token>` (papéis ADMIN/ATENDENTE/MECANICO; DELETE só ADMIN). Faça login primeiro (ver [`curls-usuario.md`](curls-usuario.md)) e inclua o header nas chamadas — os exemplos abaixo omitem o header por brevidade.

---

## 1. Criar um Cliente (pre-requisito)

Antes de cadastrar veiculos, e necessario ter um cliente cadastrado.

```bash
curl -X POST http://localhost:3000/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Joao da Silva",
    "cpfCnpj": "52998224725",
    "telefone": "11999998888",
    "email": "joao@email.com"
  }'
```

> Anote o `id` retornado — ele sera usado como `clienteId` nos proximos requests.

---

## 2. POST /veiculos — Cadastrar veiculo

### 2.1 Placa formato Mercosul

```bash
curl -X POST http://localhost:3000/veiculos \
  -H "Content-Type: application/json" \
  -d '{
    "placa": "ABC1D23",
    "marca": "Toyota",
    "modelo": "Corolla",
    "ano": 2024,
    "clienteId": "SUBSTITUIR_PELO_ID_DO_CLIENTE"
  }'
```

### 2.2 Placa formato antigo

```bash
curl -X POST http://localhost:3000/veiculos \
  -H "Content-Type: application/json" \
  -d '{
    "placa": "XYZ-9876",
    "marca": "Honda",
    "modelo": "Civic",
    "ano": 2023,
    "clienteId": "SUBSTITUIR_PELO_ID_DO_CLIENTE"
  }'
```

### 2.3 Placa duplicada (deve retornar 409 Conflict)

```bash
curl -X POST http://localhost:3000/veiculos \
  -H "Content-Type: application/json" \
  -d '{
    "placa": "ABC1D23",
    "marca": "Fiat",
    "modelo": "Uno",
    "ano": 2020,
    "clienteId": "SUBSTITUIR_PELO_ID_DO_CLIENTE"
  }'
```

### 2.4 Placa invalida (deve retornar 400 Bad Request)

```bash
curl -X POST http://localhost:3000/veiculos \
  -H "Content-Type: application/json" \
  -d '{
    "placa": "INVALIDA",
    "marca": "Fiat",
    "modelo": "Uno",
    "ano": 2020,
    "clienteId": "SUBSTITUIR_PELO_ID_DO_CLIENTE"
  }'
```

### 2.5 Cliente inexistente (deve retornar 404 Not Found)

```bash
curl -X POST http://localhost:3000/veiculos \
  -H "Content-Type: application/json" \
  -d '{
    "placa": "DEF4G56",
    "marca": "Fiat",
    "modelo": "Uno",
    "ano": 2020,
    "clienteId": "00000000-0000-0000-0000-000000000000"
  }'
```

---

## 3. GET /veiculos — Listar veiculos (paginado)

### 3.1 Listagem padrao (pagina 1, 10 itens)

```bash
curl -X GET "http://localhost:3000/veiculos" \
  -H "Content-Type: application/json"
```

### 3.2 Com paginacao

```bash
curl -X GET "http://localhost:3000/veiculos?page=1&limit=5" \
  -H "Content-Type: application/json"
```

### 3.3 Filtrar por marca

```bash
curl -X GET "http://localhost:3000/veiculos?marca=Toyota" \
  -H "Content-Type: application/json"
```

### 3.4 Paginacao + filtro combinados

```bash
curl -X GET "http://localhost:3000/veiculos?page=1&limit=5&marca=Honda" \
  -H "Content-Type: application/json"
```

---

## 4. GET /veiculos/:id — Buscar veiculo por ID

```bash
curl -X GET http://localhost:3000/veiculos/SUBSTITUIR_PELO_ID_DO_VEICULO \
  -H "Content-Type: application/json"
```

### 4.1 ID inexistente (deve retornar 404 Not Found)

```bash
curl -X GET http://localhost:3000/veiculos/00000000-0000-0000-0000-000000000000 \
  -H "Content-Type: application/json"
```

---

## 5. PATCH /veiculos/:id — Atualizar veiculo

### 5.1 Atualizar marca e modelo

```bash
curl -X PATCH http://localhost:3000/veiculos/SUBSTITUIR_PELO_ID_DO_VEICULO \
  -H "Content-Type: application/json" \
  -d '{
    "marca": "Volkswagen",
    "modelo": "Gol"
  }'
```

### 5.2 Atualizar placa

```bash
curl -X PATCH http://localhost:3000/veiculos/SUBSTITUIR_PELO_ID_DO_VEICULO \
  -H "Content-Type: application/json" \
  -d '{
    "placa": "NEW1A23"
  }'
```

### 5.3 Atualizar ano

```bash
curl -X PATCH http://localhost:3000/veiculos/SUBSTITUIR_PELO_ID_DO_VEICULO \
  -H "Content-Type: application/json" \
  -d '{
    "ano": 2025
  }'
```

### 5.4 Atualizar todos os campos de uma vez

```bash
curl -X PATCH http://localhost:3000/veiculos/SUBSTITUIR_PELO_ID_DO_VEICULO \
  -H "Content-Type: application/json" \
  -d '{
    "placa": "QRS4T56",
    "marca": "Chevrolet",
    "modelo": "Onix",
    "ano": 2024
  }'
```

### 5.5 Placa duplicada no update (deve retornar 409 Conflict)

```bash
curl -X PATCH http://localhost:3000/veiculos/SUBSTITUIR_PELO_ID_DO_VEICULO \
  -H "Content-Type: application/json" \
  -d '{
    "placa": "XYZ9876"
  }'
```

---

## 6. DELETE /veiculos/:id — Remover veiculo

```bash
curl -X DELETE http://localhost:3000/veiculos/SUBSTITUIR_PELO_ID_DO_VEICULO \
  -H "Content-Type: application/json"
```

> Retorna `204 No Content` em caso de sucesso.

### 6.1 ID inexistente (deve retornar 404 Not Found)

```bash
curl -X DELETE http://localhost:3000/veiculos/00000000-0000-0000-0000-000000000000 \
  -H "Content-Type: application/json"
```

---

## 7. GET /clientes/:clienteId/veiculos — Listar veiculos de um cliente

```bash
curl -X GET http://localhost:3000/clientes/SUBSTITUIR_PELO_ID_DO_CLIENTE/veiculos \
  -H "Content-Type: application/json"
```

### 7.1 Cliente inexistente (deve retornar 404 Not Found)

```bash
curl -X GET http://localhost:3000/clientes/00000000-0000-0000-0000-000000000000/veiculos \
  -H "Content-Type: application/json"
```

---

## Resumo dos endpoints e status codes esperados

| Metodo   | Rota                             | Sucesso | Erros possiveis            |
|----------|----------------------------------|---------|----------------------------|
| `POST`   | `/veiculos`                      | `201`   | `400`, `404`, `409`        |
| `GET`    | `/veiculos`                      | `200`   | —                          |
| `GET`    | `/veiculos/:id`                  | `200`   | `404`                      |
| `PATCH`  | `/veiculos/:id`                  | `200`   | `400`, `404`, `409`        |
| `DELETE` | `/veiculos/:id`                  | `204`   | `404`                      |
| `GET`    | `/clientes/:clienteId/veiculos`  | `200`   | `404`                      |
