import { Produto } from './produto.entity';
import { MovimentacaoEstoque } from './movimentacao-estoque.entity';

/**
 * Coordena operacoes que precisam ser atomicas entre o agregado Produto
 * e o registro de auditoria MovimentacaoEstoque.
 *
 * Essa abstracao no domain mantem cada repository focado em sua propria
 * entidade (SRP) e centraliza a regra "atualizar produto e registrar
 * movimentacao sao atomicos".
 */
export interface EstoqueUnitOfWork {
  persistirAtualizacaoComMovimentacao(
    produto: Produto,
    movimentacao: MovimentacaoEstoque,
  ): Promise<{ produto: Produto; movimentacao: MovimentacaoEstoque }>;
}

export const ESTOQUE_UNIT_OF_WORK = Symbol('EstoqueUnitOfWork');
