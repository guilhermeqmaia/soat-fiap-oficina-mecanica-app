# CURLs — Modulo Cliente

> Base URL: `http://localhost:3000`
>
> Copie e cole diretamente no Insomnia (suporta import de cURL).
> Substitua os UUIDs de exemplo pelos IDs reais retornados pela API.
>
> **Autenticação:** todos os endpoints exigem `Authorization: Bearer <token>` (papéis ADMIN/ATENDENTE/MECANICO; DELETE só ADMIN). Faça login primeiro (ver [`curls-usuario.md`](curls-usuario.md)) e inclua o header nas chamadas — os exemplos abaixo omitem o header por brevidade.

---

## 1. POST /clientes — Cadastrar cliente

### 1.1 Cliente com CPF

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

### 1.2 Cliente com CPF formatado

```bash
curl -X POST http://localhost:3000/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Maria Souza",
    "cpfCnpj": "529.982.247-25",
    "telefone": "21988887777",
    "email": "maria@email.com"
  }'
```

### 1.3 Cliente com CNPJ

```bash
curl -X POST http://localhost:3000/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Oficina do Ze LTDA",
    "cpfCnpj": "11222333000181",
    "telefone": "1133334444",
    "email": "contato@oficinaze.com"
  }'
```

### 1.4 Cliente com CNPJ formatado

```bash
curl -X POST http://localhost:3000/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Auto Pecas Silva LTDA",
    "cpfCnpj": "11.222.333/0001-81",
    "telefone": "1144445555",
    "email": "contato@autopecas.com"
  }'
```

### 1.5 Cliente sem email (opcional)

```bash
curl -X POST http://localhost:3000/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Pedro Santos",
    "cpfCnpj": "39053344705",
    "telefone": "31977776666"
  }'
```

### 1.6 CPF/CNPJ duplicado (deve retornar 409 Conflict)

```bash
curl -X POST http://localhost:3000/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Outro Joao",
    "cpfCnpj": "52998224725",
    "telefone": "11888887777",
    "email": "outro@email.com"
  }'
```

### 1.7 CPF invalido (deve retornar 400 Bad Request)

```bash
curl -X POST http://localhost:3000/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teste Invalido",
    "cpfCnpj": "00000000000",
    "telefone": "11999998888"
  }'
```

### 1.8 Campos obrigatorios ausentes (deve retornar 400 Bad Request)

```bash
curl -X POST http://localhost:3000/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "",
    "cpfCnpj": "52998224725",
    "telefone": "11999998888"
  }'
```

---

## 2. GET /clientes — Listar clientes (paginado)

### 2.1 Listagem padrao (pagina 1, 10 itens)

```bash
curl -X GET "http://localhost:3000/clientes" \
  -H "Content-Type: application/json"
```

### 2.2 Com paginacao

```bash
curl -X GET "http://localhost:3000/clientes?page=1&limit=5" \
  -H "Content-Type: application/json"
```

### 2.3 Filtrar por nome

```bash
curl -X GET "http://localhost:3000/clientes?nome=Joao" \
  -H "Content-Type: application/json"
```

### 2.4 Paginacao + filtro combinados

```bash
curl -X GET "http://localhost:3000/clientes?page=1&limit=5&nome=Silva" \
  -H "Content-Type: application/json"
```

---

## 3. GET /clientes/:id — Buscar cliente por ID

```bash
curl -X GET http://localhost:3000/clientes/SUBSTITUIR_PELO_ID_DO_CLIENTE \
  -H "Content-Type: application/json"
```

### 3.1 ID inexistente (deve retornar 404 Not Found)

```bash
curl -X GET http://localhost:3000/clientes/00000000-0000-0000-0000-000000000000 \
  -H "Content-Type: application/json"
```

---

## 4. PATCH /clientes/:id — Atualizar cliente

### 4.1 Atualizar nome

```bash
curl -X PATCH http://localhost:3000/clientes/SUBSTITUIR_PELO_ID_DO_CLIENTE \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Joao Pedro da Silva"
  }'
```

### 4.2 Atualizar telefone

```bash
curl -X PATCH http://localhost:3000/clientes/SUBSTITUIR_PELO_ID_DO_CLIENTE \
  -H "Content-Type: application/json" \
  -d '{
    "telefone": "21977776666"
  }'
```

### 4.3 Atualizar email

```bash
curl -X PATCH http://localhost:3000/clientes/SUBSTITUIR_PELO_ID_DO_CLIENTE \
  -H "Content-Type: application/json" \
  -d '{
    "email": "novo@email.com"
  }'
```

### 4.4 Atualizar multiplos campos

```bash
curl -X PATCH http://localhost:3000/clientes/SUBSTITUIR_PELO_ID_DO_CLIENTE \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Maria Aparecida Souza",
    "telefone": "21966665555",
    "email": "maria.nova@email.com"
  }'
```

### 4.5 ID inexistente (deve retornar 404 Not Found)

```bash
curl -X PATCH http://localhost:3000/clientes/00000000-0000-0000-0000-000000000000 \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teste"
  }'
```

---

## 5. DELETE /clientes/:id — Remover cliente

```bash
curl -X DELETE http://localhost:3000/clientes/SUBSTITUIR_PELO_ID_DO_CLIENTE \
  -H "Content-Type: application/json"
```

> Retorna `204 No Content` em caso de sucesso.

### 5.1 ID inexistente (deve retornar 404 Not Found)

```bash
curl -X DELETE http://localhost:3000/clientes/00000000-0000-0000-0000-000000000000 \
  -H "Content-Type: application/json"
```

---

## Resumo dos endpoints e status codes esperados

| Metodo   | Rota              | Sucesso | Erros possiveis     |
|----------|-------------------|---------|---------------------|
| `POST`   | `/clientes`       | `201`   | `400`, `409`        |
| `GET`    | `/clientes`       | `200`   | —                   |
| `GET`    | `/clientes/:id`   | `200`   | `404`               |
| `PATCH`  | `/clientes/:id`   | `200`   | `404`               |
| `DELETE` | `/clientes/:id`   | `204`   | `404`               |
