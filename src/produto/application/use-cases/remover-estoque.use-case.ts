import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Produto } from '../../domain/produto.entity';
import { ProdutoNotFoundError } from '../../domain/errors/produto-not-found.error';
import { InsufficientStockError } from '../../domain/errors/insufficient-stock.error';
import { TipoMovimentacaoEstoque } from '../../domain/value-objects/tipo-movimentacao-estoque.vo';
import { EstoqueBaixoEvent } from '../../domain/events/estoque-baixo.event';
import {
  ESTOQUE_UNIT_OF_WORK,
  EstoqueUnitOfWork,
} from '../../domain/estoque-unit-of-work';
import { MovimentacaoContext } from '../../domain/movimentacao-context';
import {
  DOMAIN_EVENT_PUBLISHER,
  DomainEventPublisher,
} from '../../../shared/application/domain-event-publisher';
import {
  PRODUTO_GATEWAY,
  ProdutoGateway,
} from '../gateways/produto.gateway';
import { persistirComMovimentacao } from './persistir-com-movimentacao';

export interface RemoverEstoqueInput {
  id: string;
  quantidade: number;
  ctx?: MovimentacaoContext;
}

@Injectable()
export class RemoverEstoqueUseCase
  implements UseCase<RemoverEstoqueInput, Produto>
{
  constructor(
    @Inject(PRODUTO_GATEWAY)
    private readonly gateway: ProdutoGateway,
    @Inject(ESTOQUE_UNIT_OF_WORK)
    private readonly uow: EstoqueUnitOfWork,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly events: DomainEventPublisher,
  ) {}

  async execute(input: RemoverEstoqueInput): Promise<Produto> {
    const produto = await this.gateway.findById(input.id);
    if (!produto) {
      throw new ProdutoNotFoundError(input.id);
    }

    if (input.quantidade > produto.quantidadeDisponivel) {
      throw new InsufficientStockError(
        produto.nome,
        input.quantidade,
        produto.quantidadeDisponivel,
      );
    }

    produto.deduct(input.quantidade);

    const updated = await persistirComMovimentacao(
      this.uow,
      produto,
      TipoMovimentacaoEstoque.SAIDA,
      input.quantidade,
      input.ctx ?? {},
    );

    if (updated.isLowStock()) {
      this.events.publish(
        new EstoqueBaixoEvent(
          updated.id!,
          updated.nome,
          updated.quantidadeEstoque,
          updated.estoqueMinimo,
        ),
      );
    }

    return updated;
  }
}
