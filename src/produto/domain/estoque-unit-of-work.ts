import { Produto } from './produto.entity';
import { TipoMovimentacaoEstoque } from './value-objects/tipo-movimentacao-estoque.vo';
import { MovimentacaoContext } from './movimentacao-context';

export interface AplicarMovimentacaoEstoqueParams {
  produtoId: string;
  tipo: TipoMovimentacaoEstoque;
  quantidade: number;
  ctx: MovimentacaoContext;
  /**
   * Operacao de dominio aplicada ao Produto ja TRAVADO/relido dentro da
   * transacao (ex.: `p => p.reserve(q)`). Deve lancar as invariantes do
   * agregado (ex.: InsufficientStockError) — a checagem roda sobre o estado
   * atual da linha, nao sobre uma leitura possivelmente obsoleta.
   */
  aplicar: (produto: Produto) => void;
}

/**
 * Coordena operacoes que precisam ser atomicas entre o agregado Produto e o
 * registro de auditoria MovimentacaoEstoque.
 *
 * `mutarComMovimentacao` executa tudo numa unica transacao com TRAVA PESSIMISTA
 * na linha do produto (`SELECT ... FOR UPDATE`): le o estado atual, aplica a
 * operacao de dominio, persiste o produto e registra a movimentacao. Isso
 * serializa reservas/baixas concorrentes do mesmo produto e evita overselling
 * (lost update do padrao read-modify-write).
 */
export interface EstoqueUnitOfWork {
  mutarComMovimentacao(
    params: AplicarMovimentacaoEstoqueParams,
  ): Promise<Produto>;
}

export const ESTOQUE_UNIT_OF_WORK = Symbol('EstoqueUnitOfWork');
