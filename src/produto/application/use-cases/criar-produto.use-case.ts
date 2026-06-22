import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Produto, CreateProdutoProps } from '../../domain/produto.entity';
import { DuplicateNameError } from '../../domain/errors/duplicate-name.error';
import {
  PRODUTO_GATEWAY,
  ProdutoGateway,
} from '../gateways/produto.gateway';

export type CriarProdutoInput = CreateProdutoProps;

@Injectable()
export class CriarProdutoUseCase implements UseCase<CriarProdutoInput, Produto> {
  constructor(
    @Inject(PRODUTO_GATEWAY)
    private readonly gateway: ProdutoGateway,
  ) {}

  async execute(input: CriarProdutoInput): Promise<Produto> {
    const exists = await this.gateway.existsByNome(input.nome);
    if (exists) {
      throw new DuplicateNameError(input.nome);
    }

    const produto = Produto.create(input);
    return this.gateway.create(produto);
  }
}
