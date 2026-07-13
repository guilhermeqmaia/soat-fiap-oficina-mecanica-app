# Guia Completo: Teste de Ordem de Serviço (OS) no Swagger

## Fluxo da Ordem de Serviço

```
RECEBIDA → EM_DIAGNOSTICO → AGUARDANDO_APROVACAO → EM_EXECUCAO → FINALIZADA → ENTREGUE
```

---

## Passo 1: Login

**Endpoint:** `POST /auth/login`

1. Abra o Swagger em `http://localhost:3000/api`
2. Localize a seção **Auth**
3. Clique em **POST /auth/login**
4. Clique em **Try it out**
5. Preencha o body:

```json
{
  "email": "admin@oficina.com",
  "senha": "admin123"
}
```

6. Clique em **Execute**
7. **Copie o `accessToken` da resposta** — você usará isso em todos os próximos passos

A resposta será algo como:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": "ec6ee661-7b63-49ca-abd4-72e26883aa53",
    "nome": "Admin Oficina",
    "email": "admin@oficina.com",
    "role": "ADMIN"
  }
}
```

---

## Passo 2: Autorizar no Swagger

1. No topo do Swagger, clique no botão **Authorize** (cadeado)
2. Cole o `accessToken` no campo **value** (sem adicionar "Bearer ", o Swagger adiciona automaticamente)
3. Clique em **Authorize**
4. Clique em **Close**

Agora todos os endpoints estarão autenticados com seu token.

---

## Passo 3: Criar um Cliente

**Endpoint:** `POST /clientes`

1. Localize a seção **Clientes**
2. Clique em **POST /clientes**
3. Clique em **Try it out**
4. Preencha o body:

```json
{
  "nome": "João Silva",
  "cpfCnpj": "52998224725",
  "telefone": "11999999999",
  "email": "joao@email.com"
}
```

5. Clique em **Execute**
6. **Copie o `id` do cliente** da resposta

Resposta esperada:
```json
{
  "id": "abc-123-def",
  "nome": "João Silva",
  "cpfCnpj": "52998224725",
  "telefone": "11999999999",
  "email": "joao@email.com"
}
```

---

## Passo 4: Criar um Veículo para o Cliente

**Endpoint:** `POST /veiculos`

1. Localize a seção **Veiculos**
2. Clique em **POST /veiculos**
3. Clique em **Try it out**
4. Preencha o body (informe o `clienteId` do cliente criado no **Passo 3**):

```json
{
  "placa": "ABC-1234",
  "marca": "Toyota",
  "modelo": "Corolla",
  "ano": 2020,
  "clienteId": "abc-123-def"
}
```

5. Clique em **Execute**
6. **Copie o `id` do veículo** da resposta

Resposta esperada:
```json
{
  "id": "veiculo-123-xyz",
  "placa": "ABC1234",
  "marca": "Toyota",
  "modelo": "Corolla",
  "ano": 2020,
  "clienteId": "abc-123-def",
  "ativo": true
}
```

---

## Passo 5: Criar uma Ordem de Serviço (Status: RECEBIDA)

**Endpoint:** `POST /ordens-servico`

1. Localize a seção **Ordens de Servico**
2. Clique em **POST /ordens-servico**
3. Clique em **Try it out**
4. Preencha o body:

```json
{
  "clienteId": "abc-123-def",
  "veiculoId": "veiculo-123-xyz",
  "descricaoInicial": "Carro fazendo barulho estranho"
}
```

5. Clique em **Execute**
6. **Copie o `id` e o `numero` da OS** da resposta

Resposta esperada:
```json
{
  "id": "os-123-456",
  "numero": "OS-001",
  "clienteId": "abc-123-def",
  "veiculoId": "veiculo-123-xyz",
  "usuarioId": null,
  "descricaoInicial": "Carro fazendo barulho estranho",
  "diagnostico": null,
  "status": "RECEBIDA",
  "createdAt": "2026-04-19T10:00:00Z",
  "updatedAt": "2026-04-19T10:00:00Z"
}
```

---

## Passo 6: Atribuir um Mecânico (Status: EM_DIAGNOSTICO)

**Endpoint:** `POST /ordens-servico/{id}/atribuir-mecanico`

Para este teste, usaremos o ID do usuário mecânico. Use:
- ID do mecânico: `ef26b646-090d-42da-9573-e453460d256a` (ou outro mecânico)

1. Clique em **POST /ordens-servico/{id}/atribuir-mecanico**
2. Clique em **Try it out**
3. No campo `id`, cole o ID da OS criada no **Passo 5**
4. Preencha o body:

```json
{
  "usuarioId": "ef26b646-090d-42da-9573-e453460d256a"
}
```

5. Clique em **Execute**

Resposta esperada — **status mudará para `EM_DIAGNOSTICO`**:
```json
{
  "id": "os-123-456",
  "numero": "OS-001",
  "status": "EM_DIAGNOSTICO",
  "usuarioId": "ef26b646-090d-42da-9573-e453460d256a",
  ...
}
```

---

## Passo 7: Criar um Produto no Catálogo

**Endpoint:** `POST /produtos`

1. Localize a seção **Produtos**
2. Clique em **POST /produtos**
3. Clique em **Try it out**
4. Preencha o body:

```json
{
  "nome": "Filtro de óleo",
  "descricao": "Filtro de óleo para motor",
  "precoUnitario": 45.90,
  "quantidadeEstoque": 100,
  "estoqueMinimo": 10
}
```

5. Clique em **Execute**
6. **Copie o `id` do produto** da resposta

Resposta esperada:
```json
{
  "id": "produto-123-xyz",
  "nome": "Filtro de óleo",
  "descricao": "Filtro de óleo para motor",
  "precoUnitario": 45.90,
  "quantidadeEstoque": 100,
  "estoqueMinimo": 10,
  "ativo": true
}
```

---

## Passo 8: Adicionar Produto a um Serviço da OS

**Endpoint:** `POST /ordens-servico/{id}/servicos/{servicoId}/produtos`

> **Importante:** A OS precisa estar no status `EM_DIAGNOSTICO` e o serviço já deve ter sido adicionado à OS (use `POST /ordens-servico/{id}/servicos` — o `servicoId` da resposta é usado aqui). O produto é vinculado a um serviço da OS.

1. Localize a seção **Ordens de Servico**
2. Clique em **POST /ordens-servico/{id}/servicos/{servicoId}/produtos**
3. Clique em **Try it out**
4. No campo `id`, cole o ID da OS criada no **Passo 5**
5. No campo `servicoId`, cole o ID do serviço adicionado à OS
6. Preencha o body:

```json
{
  "produtoId": "produto-123-xyz",
  "quantidade": 2
}
```

7. Clique em **Execute**

Resposta esperada — a OS retornará com o produto aninhado dentro do serviço, em `itensServico[].produtos`:
```json
{
  "id": "os-123-456",
  "numero": "OS-001",
  "status": "EM_DIAGNOSTICO",
  "itensServico": [
    {
      "servicoId": "servico-123-xyz",
      "quantidade": 1,
      "produtos": [
        {
          "produtoId": "produto-123-xyz",
          "quantidade": 2,
          "precoUnitario": 45.90,
          "subtotal": 91.80
        }
      ]
    }
  ],
  "valorTotalProdutos": 91.80,
  ...
}
```

---

## Passo 8.1 (Opcional): Remover Produto de um Serviço da OS

**Endpoint:** `DELETE /ordens-servico/{id}/servicos/{servicoId}/produtos/{produtoId}`

> Caso queira remover um produto adicionado por engano.

1. Clique em **DELETE /ordens-servico/{id}/servicos/{servicoId}/produtos/{produtoId}**
2. Clique em **Try it out**
3. No campo `id`, cole o ID da OS
4. No campo `servicoId`, cole o ID do serviço da OS
5. No campo `produtoId`, cole o ID do produto a remover
6. Clique em **Execute**

Resposta esperada: **204 No Content** (sem body)

---

## Passo 9: Completar Diagnóstico (Status: AGUARDANDO_APROVACAO)

**Endpoint:** `POST /ordens-servico/{id}/completar-diagnostico`

1. Clique em **POST /ordens-servico/{id}/completar-diagnostico**
2. Clique em **Try it out**
3. No campo `id`, cole o ID da OS
4. Preencha o body:

```json
{
  "diagnostico": "Correia de distribuição desgastada. Necessário substituição de peças."
}
```

5. Clique em **Execute**

Resposta esperada — **status mudará para `AGUARDANDO_APROVACAO`**:
```json
{
  "id": "os-123-456",
  "numero": "OS-001",
  "status": "AGUARDANDO_APROVACAO",
  "diagnostico": "Correia de distribuição desgastada. Necessário substituição de peças.",
  ...
}
```

---

## Passo 10: Aprovar Orçamento (Status: EM_EXECUCAO)

**Endpoint:** `POST /ordens-servico/{id}/aprovar-orcamento`

1. Clique em **POST /ordens-servico/{id}/aprovar-orcamento**
2. Clique em **Try it out**
3. No campo `id`, cole o ID da OS
4. Clique em **Execute** (sem body)

Resposta esperada — **status mudará para `EM_EXECUCAO`**:
```json
{
  "id": "os-123-456",
  "numero": "OS-001",
  "status": "EM_EXECUCAO",
  ...
}
```

---

## Passo 11: Finalizar Execução (Status: FINALIZADA)

**Endpoint:** `POST /ordens-servico/{id}/finalizar-execucao`

1. Clique em **POST /ordens-servico/{id}/finalizar-execucao**
2. Clique em **Try it out**
3. No campo `id`, cole o ID da OS
4. Clique em **Execute** (sem body)

Resposta esperada — **status mudará para `FINALIZADA`**:
```json
{
  "id": "os-123-456",
  "numero": "OS-001",
  "status": "FINALIZADA",
  ...
}
```

---

## Passo 12: Entregar Veículo (Status: ENTREGUE)

**Endpoint:** `POST /ordens-servico/{id}/entregar`

1. Clique em **POST /ordens-servico/{id}/entregar**
2. Clique em **Try it out**
3. No campo `id`, cole o ID da OS
4. Clique em **Execute** (sem body)

Resposta esperada — **status mudará para `ENTREGUE`** ✅:
```json
{
  "id": "os-123-456",
  "numero": "OS-001",
  "status": "ENTREGUE",
  ...
}
```

---

## Resumo do Fluxo

| Passo | Endpoint | Método | Status Result |
|-------|----------|--------|---------------|
| 1 | `/auth/login` | POST | — (autentica) |
| 2 | `/clientes` | POST | — (cria cliente) |
| 3 | `/veiculos` | POST | — (cria veículo) |
| 4 | `/ordens-servico` | POST | **RECEBIDA** |
| 5 | `/ordens-servico/{id}/atribuir-mecanico` | POST | **EM_DIAGNOSTICO** |
| 6 | `/ordens-servico/{id}/servicos` | POST | — (adiciona serviço) |
| 7 | `/produtos` | POST | — (cria produto) |
| 8 | `/ordens-servico/{id}/servicos/{servicoId}/produtos` | POST | — (adiciona produto ao serviço) |
| 9 | `/ordens-servico/{id}/completar-diagnostico` | POST | **AGUARDANDO_APROVACAO** |
| 10 | `/ordens-servico/{id}/aprovar-orcamento` | POST | **EM_EXECUCAO** |
| 11 | `/ordens-servico/{id}/finalizar-execucao` | POST | **FINALIZADA** |
| 12 | `/ordens-servico/{id}/entregar` | POST | **ENTREGUE** ✅ |

---

## Dicas Importantes

✅ **Sempre copie os IDs da resposta anterior** para usar nos próximos passos

✅ **Mantenha o token autorizado** durante todo o teste

✅ **Respeite a ordem dos status** — não é possível pular etapas

✅ **Você pode rejeitar um orçamento** (Passo 10 alternativo):
- Endpoint: `POST /ordens-servico/{id}/rejeitar-orcamento`
- Status resultante: **CANCELADA**

---

## Alternativa: Rejeitar Orçamento

Se desejar testar a rejeição, no **Passo 10**, em vez de aprovar:

**Endpoint:** `POST /ordens-servico/{id}/rejeitar-orcamento`

1. Clique em **POST /ordens-servico/{id}/rejeitar-orcamento**
2. Clique em **Try it out**
3. Cole o ID da OS
4. Clique em **Execute**

Resposta — **status mudará para `CANCELADA`**:
```json
{
  "id": "os-123-456",
  "numero": "OS-001",
  "status": "CANCELADA",
  ...
}
```
