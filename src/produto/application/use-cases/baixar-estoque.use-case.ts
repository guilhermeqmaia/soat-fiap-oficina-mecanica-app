import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Produto } from '../../domain/produto.entity';
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

export interface BaixarEstoqueInput {
  id: string;
  quantidade: number;
  ctx?: MovimentacaoContext;
}

@Injectable()
export class BaixarEstoqueUseCase
  implements UseCase<BaixarEstoqueInput, Produto>
{
  constructor(
    @Inject(ESTOQUE_UNIT_OF_WORK)
    private readonly uow: EstoqueUnitOfWork,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly events: DomainEventPublisher,
  ) {}

  async execute(input: BaixarEstoqueInput): Promise<Produto> {
    const updated = await this.uow.mutarComMovimentacao({
      produtoId: input.id,
      tipo: TipoMovimentacaoEstoque.BAIXA,
      quantidade: input.quantidade,
      ctx: input.ctx ?? {},
      aplicar: (produto) => produto.deduct(input.quantidade),
    });

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
