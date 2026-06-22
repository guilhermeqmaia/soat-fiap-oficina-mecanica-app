import { DomainEvent } from '../../../shared/domain/domain-event';

export class EstoqueBaixoEvent implements DomainEvent {
  static readonly EVENT_NAME = 'estoque.baixo';
  readonly eventName = EstoqueBaixoEvent.EVENT_NAME;

  constructor(
    public readonly produtoId: string,
    public readonly nomeProduto: string,
    public readonly quantidadeAtual: number,
    public readonly estoqueMinimo: number,
  ) {}
}
