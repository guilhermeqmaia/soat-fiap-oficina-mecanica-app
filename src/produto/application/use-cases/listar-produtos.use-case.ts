import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Produto } from '../../domain/produto.entity';
import {
  PRODUTO_GATEWAY,
  ProdutoGateway,
  FindAllParams,
  PaginatedResult,
} from '../gateways/produto.gateway';

export type ListarProdutosInput = FindAllParams;

@Injectable()
export class ListarProdutosUseCase
  implements UseCase<ListarProdutosInput, PaginatedResult<Produto>>
{
  constructor(
    @Inject(PRODUTO_GATEWAY)
    private readonly gateway: ProdutoGateway,
  ) {}

  execute(input: ListarProdutosInput): Promise<PaginatedResult<Produto>> {
    return this.gateway.findAll(input);
  }
}
