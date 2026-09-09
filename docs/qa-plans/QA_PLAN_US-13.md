# QA Plan — US-13: Aprovacao/Rejeicao do Orcamento pelo Cliente

## Summary
Valida os endpoints de aprovacao e recusa de orcamento via API pelo cliente: transicao de estado obrigatoria a partir de `AGUARDANDO_APROVACAO`, Policies automaticas (aprovar -> `EM_EXECUCAO`; recusar -> `CANCELADA` + estorno de reservas de estoque) e o registro de data/hora da decisao. Story de alto risco: erro aqui pode cancelar OS indevidamente ou deixar estoque reservado sem uso.

## Prerequisites
- OS em status `AGUARDANDO_APROVACAO` com servicos/produtos ja reservados no estoque
- Token de CLIENTE valido, correspondente ao dono da OS

## Test Scenarios

### TS-01: Aprovar orcamento com sucesso
- **Type:** Automated (integration)
- **Acceptance criterion:** PATCH /ordens-servico/:id/aprovar; status muda para EM_EXECUCAO
- **Precondition:** OS em AGUARDANDO_APROVACAO
- **Steps:**
  1. `PATCH /ordens-servico/:id/aprovar` com token do cliente dono da OS
  2. Verificar status 200 e `status: "EM_EXECUCAO"` na OS
  3. Verificar `dataDecisao` registrada
- **Expected result:** Transicao correta e timestamp gravado

### TS-02: Recusar orcamento com sucesso
- **Type:** Automated (integration)
- **Acceptance criterion:** PATCH /ordens-servico/:id/recusar; status muda para CANCELADA; estorna reservas
- **Precondition:** OS em AGUARDANDO_APROVACAO com produtos reservados no estoque
- **Steps:**
  1. Anotar o nivel de estoque reservado antes da recusa
  2. `PATCH /ordens-servico/:id/recusar`
  3. Verificar status 200 e `status: "CANCELADA"`
  4. Verificar que a reserva de estoque foi estornada (produto volta a ficar disponivel)
- **Expected result:** OS cancelada e estoque corretamente estornado (sem duplicar nem "vazar" quantidade)

### TS-03: Aprovar/recusar fora do status permitido
- **Type:** Automated (integration)
- **Acceptance criterion:** OS deve estar em AGUARDANDO_APROVACAO
- **Steps:**
  1. Tentar aprovar/recusar uma OS em `RECEBIDA`, `EM_DIAGNOSTICO`, `EM_EXECUCAO`, `FINALIZADA` ou `ENTREGUE`
- **Expected result:** Erro (409 Conflict ou equivalente) para cada status invalido, sem alterar a OS

### TS-04: Cliente so decide sobre a propria OS
- **Type:** Automated (e2e)
- **Steps:**
  1. Cliente A tenta aprovar/recusar uma OS pertencente ao Cliente B
- **Expected result:** 403 (ou 404, conforme politica de nao-revelacao)

### TS-05: Idempotencia / dupla decisao
- **Type:** Automated (integration)
- **Steps:**
  1. Aprovar uma OS
  2. Tentar aprovar (ou recusar) a mesma OS novamente
- **Expected result:** Segunda tentativa falha com erro de status invalido (TS-03), nao reprocessa a transicao

### TS-06: Estorno de estoque nao afeta outras OS
- **Type:** Automated (integration)
- **Steps:**
  1. Duas OS distintas reservando o mesmo produto
  2. Recusar apenas uma delas
- **Expected result:** Apenas a reserva da OS recusada e estornada; a outra OS mantem sua reserva intacta

## Edge Cases
- Recusa com `motivo` ausente (se o campo for opcional na API) — deve funcionar normalmente
- Falha ao estornar o estoque (ex.: erro de banco no meio da transacao) — a OS nao deveria ficar `CANCELADA` com o estoque nao estornado (atomicidade da Policy); documentar comportamento transacional esperado
- Concorrencia: aprovar e recusar quase simultaneamente na mesma OS — apenas uma transicao deve vencer, sem estado inconsistente

## Traceability

| Acceptance Criterion | Test Scenarios |
|---|---|
| PATCH aprovar | TS-01 |
| PATCH recusar | TS-02 |
| OS deve estar em AGUARDANDO_APROVACAO | TS-03 |
| Aprovar -> EM_EXECUCAO | TS-01 |
| Recusar -> CANCELADA | TS-02 |
| Recusar -> estorna reservas | TS-02, TS-06 |
| Registrar data/hora da decisao | TS-01 |
| Testes de integracao para ambos os fluxos | TS-01, TS-02 |

## Validation Checklist
- [ ] Todos os criterios de aceite cobertos
- [ ] Edge cases documentados (atomicidade do estorno, concorrencia)
- [ ] Fluxos de erro documentados
- [ ] Instrucoes de setup claras

## Useful Commands
```bash
npm run test:unit
npm run test:integration
npx jest ordem-de-servico --verbose
```

## Nota (backfill — US-F3-DOC-07)
QA Plan criado retroativamente com prioridade alta: e a transicao de estado com maior impacto financeiro/operacional (cancelamento + estorno de estoque) do fluxo de OS, e alimenta diretamente o alerta de "falha no processamento de ordens de servico" da US-F3-11.
