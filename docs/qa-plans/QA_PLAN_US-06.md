# QA Plan — US-06: Abertura de Ordem de Servico

## Summary
Valida a abertura de uma OS: identificacao do cliente por CPF/CNPJ, listagem de veiculos para selecao, criacao com status inicial `RECEBIDA`, numero unico, timestamp de abertura, e os casos de erro (cliente/veiculo nao encontrado).

## Prerequisites
- Docker (testcontainers) ou banco local com seeds
- Cliente cadastrado com pelo menos 1 veiculo vinculado
- Token valido (ATENDENTE ou ADMIN) para chamar `POST /ordens-servico`

## Test Scenarios

### TS-01: Abertura de OS com cliente e veiculo validos
- **Type:** Automated (e2e/integration)
- **Acceptance criterion:** OS criada com status inicial RECEBIDA; numero unico; data/hora registrada
- **Steps:**
  1. `POST /ordens-servico` com `clienteId`/CPF e `veiculoId` validos
  2. Verificar status 201
  3. Verificar resposta com `status: "RECEBIDA"`, `numero` (unico) e `dataAbertura`
- **Expected result:** OS criada corretamente

### TS-02: Numero da OS e unico
- **Type:** Automated (unit/integration)
- **Steps:**
  1. Criar 2 OS em sequencia
  2. Comparar os `numero` gerados
- **Expected result:** Numeros distintos, sem colisao mesmo sob concorrencia (testar criacao paralela, se possivel)

### TS-03: Listagem de veiculos do cliente para selecao
- **Type:** Automated (integration)
- **Acceptance criterion:** Read Model de veiculos do cliente
- **Steps:**
  1. `GET` do endpoint de veiculos por cliente (usado no formulario de abertura)
- **Expected result:** Retorna apenas os veiculos vinculados aquele cliente

### TS-04: Cliente nao encontrado
- **Type:** Automated (e2e)
- **Acceptance criterion:** Retornar 404 se cliente nao encontrado
- **Steps:**
  1. `POST /ordens-servico` com `clienteId` inexistente
- **Expected result:** 404

### TS-05: Veiculo nao encontrado (ou nao pertence ao cliente)
- **Type:** Automated (e2e)
- **Steps:**
  1. `POST /ordens-servico` com `veiculoId` inexistente
  2. `POST /ordens-servico` com `veiculoId` de outro cliente
- **Expected result:** 404 nos dois casos

### TS-06: Identificacao por CPF ou CNPJ
- **Type:** Automated (unit/integration)
- **Steps:**
  1. Abrir OS identificando o cliente por CPF
  2. Abrir OS identificando o cliente por CNPJ (cliente PJ, se suportado)
- **Expected result:** Ambos os formatos aceitos e resolvidos corretamente

## Edge Cases
- Corpo da requisicao sem `veiculoId` — deve validar e retornar 400, nao 500
- CPF/CNPJ com formato invalido no payload — 400/422 antes de consultar o banco
- Criacao de OS para cliente inativo — decidir e documentar comportamento esperado (permitir ou bloquear)

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| Identificar cliente por CPF/CNPJ | TS-01, TS-06 |
| Listar veiculos do cliente | TS-03 |
| OS criada com status RECEBIDA | TS-01 |
| Numero unico | TS-01, TS-02 |
| Data/hora de abertura | TS-01 |
| POST /ordens-servico | TS-01, TS-04, TS-05 |
| 404 cliente/veiculo nao encontrado | TS-04, TS-05 |
| Testes unitarios da entidade | TS-01, TS-02 (specs unitarios da entidade) |
| Testes de integracao do fluxo completo | TS-01, TS-04, TS-05 |

## Validation Checklist
- [ ] Todos os criterios de aceite cobertos
- [ ] Edge cases documentados
- [ ] Fluxos de erro documentados
- [ ] Instrucoes de setup claras

## Useful Commands
```bash
npm run test:unit
npm run test:integration
npx jest ordem-de-servico --verbose
```

## Nota (backfill — US-F3-DOC-07)
QA Plan criado retroativamente como parte do backfill priorizado por risco (dominio OS). Prioridade alta por ser o ponto de entrada de todo o fluxo de negocio.
