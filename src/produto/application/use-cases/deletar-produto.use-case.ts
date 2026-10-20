import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '@guilhermeqmaia/oficina-kit/core';
import { ProdutoNotFoundError } from '../../domain/errors/produto-not-found.error';
import {
  PRODUTO_GATEWAY,
  ProdutoGateway,
} from '../gateways/produto.gateway';

export interface DeletarProdutoInput {
  id: string;
}

@Injectable()
export class DeletarProdutoUseCase
  implements UseCase<DeletarProdutoInput, void>
{
  constructor(
    @Inject(PRODUTO_GATEWAY)
    private readonly gateway: ProdutoGateway,
  ) {}

  async execute(input: DeletarProdutoInput): Promise<void> {
    const produto = await this.gateway.findById(input.id);
    if (!produto) {
      throw new ProdutoNotFoundError(input.id);
    }
    await this.gateway.delete(input.id);
  }
}
