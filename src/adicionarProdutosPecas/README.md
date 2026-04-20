# Oficina Mecânica API — Módulo: Adicionar Produtos/Peças à OS

> Story: *"Como Mecânico, quero adicionar produtos e peças a uma OS, para compor o orçamento e reservar os itens no estoque."*

---

## Estrutura do Projeto

```
src/
├── domain/
│   ├── ordemDeServico/
│   │   ├── entities/
│   │   │   └── OrdemDeServico.js          # Agregado raiz — regras de negócio
│   │   ├── valueObjects/
│   │   │   ├── ItemOrdemDeServico.js      # Imutável — item vinculado à OS
│   │   │   └── StatusOrdemDeServico.js    # Enum de status (linguagem ubíqua)
│   │   ├── events/
│   │   │   ├── ProdutoAdicionadoNaOS.js   # Domain Event → reserva estoque
│   │   │   └── ProdutoRemovidoDaOS.js     # Domain Event → estorna reserva
│   │   └── repositories/
│   │       └── IOrdemDeServicoRepository.js  # Contrato (interface)
│   └── produto/
│       └── repositories/
│           └── IProdutoRepository.js      # Contrato do BC Estoque
│
├── application/
│   └── ordemDeServico/useCases/
│       ├── AdicionarProdutoNaOS.js        # Orquestra: valida, adiciona, reserva
│       └── RemoverProdutoDaOS.js          # Orquestra: remove, estorna
│
├── infrastructure/
│   ├── repositories/
│   │   ├── InMemoryOrdemDeServicoRepository.js  # ⚠️ Substituir pelo BD real
│   │   └── InMemoryProdutoRepository.js         # ⚠️ Substituir pelo BC Estoque
│   └── http/
│       ├── controllers/OrdemDeServicoController.js
│       ├── routes/ordemDeServico.routes.js
│       └── middlewares/errorHandler.js
│
├── shared/errors/
│   ├── ErroOSNaoEncontrada.js
│   ├── ErroProdutoNaoEncontrado.js
│   └── ErroEstoqueInsuficiente.js         # Policy v3 — sem estoque
│
└── server.js                              # Composição + start da aplicação

tests/
├── domain/OrdemDeServico.test.js          # Testes unitários de domínio
└── integration/ordemDeServico.routes.test.js  # Testes de integração HTTP
```

---

## Como rodar

```bash
npm install
npm run dev       # desenvolvimento com hot reload
npm test          # testes
```

---

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/ordens-servico/:id/produtos` | Adiciona produto à OS e reserva no estoque |
| `DELETE` | `/ordens-servico/:id/produtos/:produtoId` | Remove produto e estorna reserva |

### POST — Body
```json
{
  "produtoId": "prod-001",
  "quantidade": 2
}
```

### Respostas possíveis

| Status | Situação |
|--------|----------|
| `201` | Produto adicionado com sucesso |
| `200` | Produto removido com sucesso |
| `400` | Body inválido (campos faltando) |
| `404` | OS ou Produto não encontrado |
| `422` | Estoque insuficiente (Policy v3) |
| `500` | Erro interno inesperado |

---

## 🔌 Pontos de Integração com o Grupo

### 1. Banco de Dados (quando definido)
Substitua os repositórios em memória por implementações reais.
Basta criar uma classe que estenda a interface correspondente:

```js
// Exemplo com Mongoose/MongoDB
class MongoOrdemDeServicoRepository extends IOrdemDeServicoRepository {
  async buscarPorId(id) { /* ... */ }
  async salvar(os) { /* ... */ }
}
```

Depois registre no `server.js`:
```js
// Antes:
const osRepository = new InMemoryOrdemDeServicoRepository();
// Depois:
const osRepository = new MongoOrdemDeServicoRepository();
```

---

### 2. BC de Estoque (colega responsável)
O contrato está em `src/domain/produto/repositories/IProdutoRepository.js`.

Métodos necessários:
- `buscarPorId(produtoId)` → `{ id, nome, valorUnitario, quantidadeDisponivel }`
- `verificarDisponibilidade(produtoId, quantidade)` → `boolean`
- `reservarEstoque(produtoId, quantidade)` → `void`
- `estornarReserva(produtoId, quantidade)` → `void`

---

### 3. Schema da OS (colega responsável pelo agregado principal)
A entidade `OrdemDeServico.js` já possui os campos:
- `mecanicoId` ✅
- `veiculoId` ✅

Campos adicionais que o colega definir no schema podem ser incluídos no construtor sem quebrar nada, pois são passados via desestruturação com `...outros`.

---

### 4. Domain Events (opcional — se o grupo usar Event Bus)
Dois eventos já estão sendo emitidos pela entidade:
- `ProdutoAdicionadoNaOS` → handler deve reservar estoque
- `ProdutoRemovidoDaOS` → handler deve estornar reserva

No `server.js` e nos use cases há um comentário marcado com `⚠️` indicando onde publicar no event bus do grupo.

---

## Linguagem Ubíqua (DDD)

| Termo | Significado |
|-------|-------------|
| `OrdemDeServico` | Agregado raiz do BC Atendimento |
| `ItemOrdemDeServico` | Value Object — produto vinculado a uma OS com quantidade e valor |
| `EM_DIAGNOSTICO` | Único status que permite adicionar/remover produtos |
| `reservarEstoque` | Bloquear quantidade disponível para uso nesta OS |
| `estornarReserva` | Devolver quantidade ao estoque ao remover produto da OS |
| `ProdutoAdicionadoNaOS` | Domain Event — gatilho para reserva no BC Estoque |
| `ProdutoRemovidoDaOS` | Domain Event — gatilho para estorno no BC Estoque |
