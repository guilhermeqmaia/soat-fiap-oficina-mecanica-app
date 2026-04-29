/**
 * Contexto opcional de uma movimentacao de estoque.
 *
 * Descreve quem/por que/de onde a movimentacao foi originada.
 * Preenchido pelo controller (com o usuario logado) e pelo
 * fluxo de OS quando a US-10 mergear (com a OS de origem).
 */
export interface MovimentacaoContext {
  ordemDeServicoId?: string;
  motivo?: string;
  usuarioId?: string;
}
