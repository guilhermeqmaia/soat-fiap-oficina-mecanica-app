/**
 * Por que uma OS foi cancelada (mesmo enum do evento `os.cancelada` no AsyncAPI).
 * Os motivos de saga vem das compensacoes (RFC-0005); OPERADOR e o cancelamento
 * manual pelo atendente.
 */
export enum MotivoCancelamento {
  EXECUCAO_RECUSADA = 'EXECUCAO_RECUSADA',
  ORCAMENTO_REJEITADO = 'ORCAMENTO_REJEITADO',
  PAGAMENTO_RECUSADO = 'PAGAMENTO_RECUSADO',
  TIMEOUT_APROVACAO = 'TIMEOUT_APROVACAO',
  TIMEOUT_PAGAMENTO = 'TIMEOUT_PAGAMENTO',
  FALHA_INICIO_EXECUCAO = 'FALHA_INICIO_EXECUCAO',
  OPERADOR = 'OPERADOR',
}
