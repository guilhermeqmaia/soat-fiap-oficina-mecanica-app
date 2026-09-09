# QA Plan — US-11: Calculo Automatico do Orcamento

## Summary
Valida o calculo automatico do orcamento da OS (soma de servicos + produtos), o recalculo automatico via Policy quando itens sao adicionados/removidos, o historico do valor e a exposicao do total em `GET /ordens-servico/:id`.

## Prerequisites
- OS criada e em status que permite adicionar servicos/produtos (ver US-09/US-10)
- Catalogo de servicos e produtos com precos conhecidos, seedados

## Test Scenarios

### TS-01: Orcamento inicial e a soma de servicos + produtos
- **Type:** Automated (unit)
- **Acceptance criterion:** Orcamento = soma dos precos dos servicos + soma dos precos dos produtos
- **Steps:**
  1. Adicionar 2 servicos (precos conhecidos) e 2 produtos (precos e quantidades conhecidas) a uma OS
  2. Consultar o orcamento calculado
- **Expected result:** Valor = soma exata (servicos + produtos × quantidade)

### TS-02: Recalculo ao adicionar um item
- **Type:** Automated (unit/integration)
- **Acceptance criterion:** Recalcular sempre que servico/produto for adicionado (Policy)
- **Steps:**
  1. OS com orcamento X
  2. Adicionar mais um servico/produto
  3. Consultar o orcamento novamente
- **Expected result:** Novo valor = X + preco do item adicionado

### TS-03: Recalculo ao remover um item
- **Type:** Automated (unit/integration)
- **Steps:**
  1. OS com 2 itens
  2. Remover 1 item
  3. Consultar o orcamento
- **Expected result:** Orcamento reduzido exatamente pelo valor do item removido

### TS-04: Historico do valor do orcamento
- **Type:** Automated (integration)
- **Acceptance criterion:** Manter historico do valor do orcamento
- **Steps:**
  1. Realizar 3 alteracoes de itens em sequencia
  2. Consultar o historico de valores do orcamento
- **Expected result:** Historico reflete os 3 valores intermediarios, nao apenas o atual

### TS-05: GET /ordens-servico/:id inclui o total
- **Type:** Automated (e2e)
- **Steps:**
  1. `GET /ordens-servico/:id`
- **Expected result:** Payload inclui o campo do valor total do orcamento, consistente com o calculado

## Edge Cases
- Servico/produto com preco zero ou promocional — soma deve continuar correta
- Remocao de todos os itens — orcamento deve zerar, nao ficar com valor residual
- Alteracao de preco no catalogo APOS o item ja ter sido adicionado a OS — o orcamento da OS deve manter o preco no momento da adicao (nao recalcular retroativamente pelo preco atual do catalogo), a menos que documentado o contrario

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| Orcamento = soma servicos + produtos | TS-01 |
| Recalculo ao adicionar/remover (Policy) | TS-02, TS-03 |
| Historico do valor | TS-04 |
| GET inclui valor total | TS-05 |
| Testes unitarios do calculo | TS-01, TS-02, TS-03 |

## Validation Checklist
- [ ] Todos os criterios de aceite cobertos
- [ ] Edge cases documentados
- [ ] Fluxos de erro documentados
- [ ] Instrucoes de setup claras

## Useful Commands
```bash
npm run test:unit
npm run test:integration
```

## Nota (backfill — US-F3-DOC-07)
QA Plan criado retroativamente. Prioridade alta: e logica financeira central do fluxo de OS, e erros de calculo tem impacto direto no cliente.
