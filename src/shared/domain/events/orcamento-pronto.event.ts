import { DomainEvent } from '@guilhermeqmaia/oficina-kit/core';

/**
 * Evento publicado pelo BC Atendimento (OrdemDeServico) quando
 * um orcamento esta pronto para aprovacao do cliente.
 *
 * Consumido pelo BC Notificacao para enviar email/SMS.
 */
export class OrcamentoProntoEvent extends DomainEvent {
  static readonly EVENT_NAME = 'os.orcamento-pronto';
  readonly eventName = OrcamentoProntoEvent.EVENT_NAME;

  constructor(
    public readonly ordemDeServicoId: string,
    public readonly numero: string,
    public readonly clienteId: string,
    public readonly diagnostico: string,
    public readonly valorTotal: number,
  ) {
    super();
  }
}
