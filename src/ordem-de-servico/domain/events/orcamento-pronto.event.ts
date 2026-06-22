import { DomainEvent } from '../../../shared/domain/domain-event';

export class OrcamentoProntoEvent implements DomainEvent {
  static readonly EVENT_NAME = 'os.orcamento-pronto';
  readonly eventName = OrcamentoProntoEvent.EVENT_NAME;

  constructor(
    public readonly ordemDeServicoId: string,
    public readonly numero: string,
    public readonly clienteId: string,
    public readonly diagnostico: string,
    public readonly valorTotal: number,
  ) {}
}
