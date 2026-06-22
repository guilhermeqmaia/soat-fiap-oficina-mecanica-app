import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { MovimentacaoEstoque } from '../../domain/movimentacao-estoque.entity';
import {
  MOVIMENTACAO_ESTOQUE_GATEWAY,
  MovimentacaoEstoqueGateway,
  FindMovimentacoesParams,
  PaginatedResult,
} from '../gateways/movimentacao-estoque.gateway';

export type ListarMovimentacoesInput = FindMovimentacoesParams;

@Injectable()
export class ListarMovimentacoesUseCase
  implements UseCase<ListarMovimentacoesInput, PaginatedResult<MovimentacaoEstoque>>
{
  constructor(
    @Inject(MOVIMENTACAO_ESTOQUE_GATEWAY)
    private readonly gateway: MovimentacaoEstoqueGateway,
  ) {}

  execute(
    input: ListarMovimentacoesInput,
  ): Promise<PaginatedResult<MovimentacaoEstoque>> {
    return this.gateway.findAll(input);
  }
}
