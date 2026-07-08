import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Produto } from '../../domain/produto.entity';
import { TipoMovimentacaoEstoque } from '../../domain/value-objects/tipo-movimentacao-estoque.vo';
import {
  ESTOQUE_UNIT_OF_WORK,
  EstoqueUnitOfWork,
} from '../../domain/estoque-unit-of-work';
import { MovimentacaoContext } from '../../domain/movimentacao-context';

export interface AdicionarEstoqueInput {
  id: string;
  quantidade: number;
  ctx?: MovimentacaoContext;
}

@Injectable()
export class AdicionarEstoqueUseCase
  implements UseCase<AdicionarEstoqueInput, Produto>
{
  constructor(
    @Inject(ESTOQUE_UNIT_OF_WORK)
    private readonly uow: EstoqueUnitOfWork,
  ) {}

  async execute(input: AdicionarEstoqueInput): Promise<Produto> {
    return this.uow.mutarComMovimentacao({
      produtoId: input.id,
      tipo: TipoMovimentacaoEstoque.ENTRADA,
      quantidade: input.quantidade,
      ctx: input.ctx ?? {},
      aplicar: (produto) => produto.addStock(input.quantidade),
    });
  }
}
