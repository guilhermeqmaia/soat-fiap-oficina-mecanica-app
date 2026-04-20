/**
 * Enum: StatusOrdemDeServico
 * Linguagem ubíqua — estados possíveis de uma OS na oficina.
 * ⚠️  Alinhe com os colegas se novos status forem adicionados.
 */
export enum StatusOrdemDeServico {
  EM_DIAGNOSTICO = 'EM_DIAGNOSTICO',
  AGUARDANDO_APROVACAO = 'AGUARDANDO_APROVACAO',
  EM_EXECUCAO = 'EM_EXECUCAO',
  CONCLUIDA = 'CONCLUIDA',
  CANCELADA = 'CANCELADA',
}
