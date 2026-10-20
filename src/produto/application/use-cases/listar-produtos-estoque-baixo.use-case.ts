import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '@guilhermeqmaia/oficina-kit/core';
import { Produto } from '../../domain/produto.entity';
import {
  PRODUTO_GATEWAY,
  ProdutoGateway,
} from '../gateways/produto.gateway';

@Injectable()
export class ListarProdutosEstoqueBaixoUseCase
  implements UseCase<void, Produto[]>
{
  constructor(
    @Inject(PRODUTO_GATEWAY)
    private readonly gateway: ProdutoGateway,
  ) {}

  execute(): Promise<Produto[]> {
    return this.gateway.findLowStock();
  }
}
