import { MovimentacaoEstoque } from './movimentacao-estoque.entity';
import { TipoMovimentacaoEstoque } from './value-objects/tipo-movimentacao-estoque.vo';

export interface FindMovimentacoesParams {
  page: number;
  limit: number;
  produtoId?: string;
  ordemDeServicoId?: string;
  tipo?: TipoMovimentacaoEstoque;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface MovimentacaoEstoqueRepository {
  create(movimentacao: MovimentacaoEstoque): Promise<MovimentacaoEstoque>;
  findAll(
    params: FindMovimentacoesParams,
  ): Promise<PaginatedResult<MovimentacaoEstoque>>;
}

export const MOVIMENTACAO_ESTOQUE_REPOSITORY = Symbol(
  'MovimentacaoEstoqueRepository',
);
