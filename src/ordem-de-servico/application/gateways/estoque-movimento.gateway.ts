/**
 * Porta de MOVIMENTACAO de estoque usada pelo contexto de Atendimento
 * (OrdemDeServico) para reservar, baixar e estornar estoque conforme o ciclo de
 * vida da OS. Diferente dos `consulta.gateways` (somente leitura), esta porta
 * expressa COMANDOS sobre o contexto de Estoque.
 *
 * O adapter (infra) delega aos use cases de Estoque, que cuidam de persistencia,
 * registro de movimentacao e eventos — mantendo o contexto de OS desacoplado.
 */
export interface EstoqueMovimentoContext {
  ordemDeServicoId?: string;
  motivo?: string;
  usuarioId?: string;
}

export interface EstoqueMovimentoGateway {
  /** Reserva estoque de um produto (falha se nao houver disponivel). */
  reservar(
    produtoId: string,
    quantidade: number,
    ctx?: EstoqueMovimentoContext,
  ): Promise<void>;

  /** Baixa definitiva do estoque reservado (consumo na execucao). */
  baixar(
    produtoId: string,
    quantidade: number,
    ctx?: EstoqueMovimentoContext,
  ): Promise<void>;

  /** Estorna uma reserva previamente feita (reprovacao/cancelamento). */
  liberar(
    produtoId: string,
    quantidade: number,
    ctx?: EstoqueMovimentoContext,
  ): Promise<void>;
}

export const ESTOQUE_MOVIMENTO_GATEWAY = Symbol('EstoqueMovimentoGateway');
