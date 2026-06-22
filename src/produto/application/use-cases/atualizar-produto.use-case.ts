import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Produto, UpdateProdutoProps } from '../../domain/produto.entity';
import { ProdutoNotFoundError } from '../../domain/errors/produto-not-found.error';
import { DuplicateNameError } from '../../domain/errors/duplicate-name.error';
import {
  PRODUTO_GATEWAY,
  ProdutoGateway,
} from '../gateways/produto.gateway';

export interface AtualizarProdutoInput {
  id: string;
  props: UpdateProdutoProps;
}

@Injectable()
export class AtualizarProdutoUseCase
  implements UseCase<AtualizarProdutoInput, Produto>
{
  constructor(
    @Inject(PRODUTO_GATEWAY)
    private readonly gateway: ProdutoGateway,
  ) {}

  async execute(input: AtualizarProdutoInput): Promise<Produto> {
    const produto = await this.gateway.findById(input.id);
    if (!produto) {
      throw new ProdutoNotFoundError(input.id);
    }

    if (input.props.nome !== undefined) {
      const exists = await this.gateway.existsByNome(input.props.nome, input.id);
      if (exists) {
        throw new DuplicateNameError(input.props.nome);
      }
    }

    produto.update(input.props);
    return this.gateway.update(produto);
  }
}
