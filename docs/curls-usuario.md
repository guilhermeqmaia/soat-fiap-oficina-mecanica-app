# USUARIO CRUD - CURLs para Testes

## Pré-requisitos

1. Servidor rodando: `npm run start:dev`
2. Obter token de autenticação (admin)
3. Substituir `<token>` pelas variáveis nos exemplos abaixo

## 1. AUTENTICAÇÃO (Login)

```bash
# Login para obter JWT token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@oficina.com",
    "senha": "admin123"
  }'

# Resposta:
# {
#   "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "usuario": {
#     "id": "550e8400-e29b-41d4-a716-446655440000",
#     "nome": "Admin Oficina",
#     "email": "admin@oficina.com",
#     "role": "ADMIN"
#   }
# }
```

**Salve o token para usar nos próximos requests**

---

## 2. CRIAR USUÁRIO

### Criar usuário com role MECANICO

```bash
curl -X POST http://localhost:3000/usuario \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João da Silva",
    "email": "joao.silva@mecanica.com",
    "senha": "senha123456",
    "role": "MECANICO"
  }'

# Resposta:
# {
#   "id": "550e8400-e29b-41d4-a716-446655440000",
#   "nome": "João da Silva",
#   "email": "joao.silva@mecanica.com",
#   "role": "MECANICO",
#   "ativo": true
# }
```

### Criar usuário com role ATENDENTE

```bash
curl -X POST http://localhost:3000/usuario \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Maria Atendente",
    "email": "maria.atendente@mecanica.com",
    "senha": "senha123456",
    "role": "ATENDENTE"
  }'
```

### Criar usuário com role ESTOQUISTA

```bash
curl -X POST http://localhost:3000/usuario \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Pedro Estoquista",
    "email": "pedro.estoque@mecanica.com",
    "senha": "senha123456",
    "role": "ESTOQUISTA"
  }'
```

### Criar usuário com role ADMIN

```bash
curl -X POST http://localhost:3000/usuario \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Admin Sistema",
    "email": "admin.novo@mecanica.com",
    "senha": "senha123456",
    "role": "ADMIN"
  }'
```

---

## 3. LISTAR USUÁRIOS

### Listar todos (paginação padrão)

```bash
curl -X GET "http://localhost:3000/usuario" \
  -H "Authorization: Bearer <token>"

# Resposta:
# {
#   "data": [
#     {
#       "id": "550e8400-e29b-41d4-a716-446655440000",
#       "nome": "João da Silva",
#       "email": "joao.silva@mecanica.com",
#       "role": "MECANICO",
#       "ativo": true
#     }
#   ],
#   "total": 1,
#   "page": 1,
#   "limit": 10
# }
```

### Listar com filtro por role (MECANICO)

```bash
curl -X GET "http://localhost:3000/usuario?page=1&limit=10&role=MECANICO" \
  -H "Authorization: Bearer <token>"
```

### Listar com filtro por role (ATENDENTE)

```bash
curl -X GET "http://localhost:3000/usuario?role=ATENDENTE" \
  -H "Authorization: Bearer <token>"
```

### Listar apenas usuários ativos

```bash
curl -X GET "http://localhost:3000/usuario?ativo=true" \
  -H "Authorization: Bearer <token>"
```

### Listar apenas usuários inativos

```bash
curl -X GET "http://localhost:3000/usuario?ativo=false" \
  -H "Authorization: Bearer <token>"
```

### Listar com paginação customizada

```bash
curl -X GET "http://localhost:3000/usuario?page=2&limit=5" \
  -H "Authorization: Bearer <token>"
```

### Listar múltiplos filtros

```bash
curl -X GET "http://localhost:3000/usuario?page=1&limit=10&role=MECANICO&ativo=true" \
  -H "Authorization: Bearer <token>"
```

---

## 4. BUSCAR USUÁRIO POR ID

```bash
curl -X GET "http://localhost:3000/usuario/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <token>"

# Resposta:
# {
#   "id": "550e8400-e29b-41d4-a716-446655440000",
#   "nome": "João da Silva",
#   "email": "joao.silva@mecanica.com",
#   "role": "MECANICO",
#   "ativo": true
# }
```

---

## 5. ATUALIZAR USUÁRIO

### Atualizar nome

```bash
curl -X PUT "http://localhost:3000/usuario/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva Atualizado"
  }'
```

### Atualizar role

```bash
curl -X PUT "http://localhost:3000/usuario/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "ATENDENTE"
  }'
```

### Desativar usuário

```bash
curl -X PUT "http://localhost:3000/usuario/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "ativo": false
  }'
```

### Ativar usuário

```bash
curl -X PUT "http://localhost:3000/usuario/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "ativo": true
  }'
```

### Atualizar múltiplos campos

```bash
curl -X PUT "http://localhost:3000/usuario/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João Silva Novo",
    "email": "joao.novo@mecanica.com",
    "role": "ESTOQUISTA",
    "ativo": true
  }'
```

---

## 6. DELETAR USUÁRIO

```bash
curl -X DELETE "http://localhost:3000/usuario/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <token>"

# Resposta: 204 No Content
```

---

## 7. FLUXO COMPLETO DE TESTE

### Passo 1: Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@oficina.com",
    "senha": "admin123"
  }' | jq -r '.accessToken' > token.txt

TOKEN=$(cat token.txt)
```

### Passo 2: Criar novo usuário

```bash
curl -X POST http://localhost:3000/usuario \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teste Mecânico",
    "email": "teste@mecanica.com",
    "senha": "teste123456",
    "role": "MECANICO"
  }' | jq -r '.id' > usuario_id.txt

USUARIO_ID=$(cat usuario_id.txt)
```

### Passo 3: Buscar usuário criado

```bash
curl -X GET "http://localhost:3000/usuario/$USUARIO_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Passo 4: Atualizar usuário

```bash
curl -X PUT "http://localhost:3000/usuario/$USUARIO_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teste Mecânico Atualizado",
    "role": "ATENDENTE"
  }' | jq
```

### Passo 5: Listar usuários

```bash
curl -X GET "http://localhost:3000/usuario?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Passo 6: Deletar usuário

```bash
curl -X DELETE "http://localhost:3000/usuario/$USUARIO_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nStatus: %{http_code}\n"
```

---

## 8. USO COM INSOMNIA

1. Importe este arquivo no Insomnia
2. Crie uma Environment com variável `token` (deixe em branco)
3. Execute Login primeiro
4. Copie o `accessToken` da resposta
5. Defina `token` na Environment
6. Use `{{ token }}` nos headers Authorization nos demais requests

**Environment Variable:**
```json
{
  "token": "seu_token_aqui",
  "base_url": "http://localhost:3000",
  "usuario_id": "uuid_do_usuario"
}
```

---

## 9. CÓDIGOS DE RESPOSTA

| Código | Significado |
|--------|-----------|
| 201 | Criado com sucesso |
| 200 | Requisição bem-sucedida |
| 204 | Deletado com sucesso |
| 400 | Dados inválidos |
| 401 | Não autenticado |
| 403 | Não autorizado |
| 404 | Usuário não encontrado |
| 409 | Conflito (email duplicado) |
| 500 | Erro interno do servidor |

---

## 10. CURL COM JQ (Pretty Print)

Para instalar jq: `brew install jq` (Mac) ou `choco install jq` (Windows)

Todos os requests podem ser terminados com `| jq` para melhor visualização:

```bash
curl -X GET "http://localhost:3000/usuario?page=1&limit=10" \
  -H "Authorization: Bearer <token>" | jq .
```

---

## Relação com Ordem de Serviço

O usuário com role **MECANICO** pode ser atribuído a uma Ordem de Serviço:

```bash
# Depois de criar um usuário MECANICO, você pode usá-lo em:
# POST /ordens-servico/:id/atribuir-mecanico
# Com usuarioId = id do usuário criado
```
