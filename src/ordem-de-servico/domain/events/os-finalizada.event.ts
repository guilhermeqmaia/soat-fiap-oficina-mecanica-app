import { DomainEvent } from '../../../shared/application/domain-event';

export class OsFinalizadaEvent implements DomainEvent {
  static readonly EVENT_NAME = 'os.finalizada';
  readonly eventName = OsFinalizadaEvent.EVENT_NAME;

  constructor(
    public readonly ordemDeServicoId: string,
    public readonly numero: string,
    public readonly clienteId: string,
  ) {}
}
