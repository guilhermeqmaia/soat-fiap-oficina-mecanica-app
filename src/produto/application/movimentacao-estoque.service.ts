import { Inject, Injectable } from '@nestjs/common';
import { MovimentacaoEstoque } from '../domain/movimentacao-estoque.entity';
import {
  FindMovimentacoesParams,
  MOVIMENTACAO_ESTOQUE_REPOSITORY,
  MovimentacaoEstoqueRepository,
  PaginatedResult,
} from '../domain/movimentacao-estoque.repository';

@Injectable()
export class MovimentacaoEstoqueService {
  constructor(
    @Inject(MOVIMENTACAO_ESTOQUE_REPOSITORY)
    private readonly repository: MovimentacaoEstoqueRepository,
  ) {}

  async findAll(
    params: FindMovimentacoesParams,
  ): Promise<PaginatedResult<MovimentacaoEstoque>> {
    return this.repository.findAll(params);
  }
}
