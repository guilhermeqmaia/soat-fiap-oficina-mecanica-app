import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import {
  DOMAIN_EVENT_PUBLISHER,
  DomainEventPublisher,
} from '../../../shared/application/domain-event-publisher';
import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import { OsFinalizadaEvent } from '../../domain/events/os-finalizada.event';
import {
  ORDEM_DE_SERVICO_GATEWAY,
  OrdemDeServicoGateway,
} from '../gateways/ordem-de-servico.gateway';
import { carregarOrdemOuFalhar } from './carregar-ordem';

export interface ConcluirServicoInput {
  id: string;
  servicoId: string;
  horasTrabalhadas: number;
}

@Injectable()
export class ConcluirServicoUseCase
  implements UseCase<ConcluirServicoInput, OrdemDeServico>
{
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly events: DomainEventPublisher,
  ) {}

  async execute(input: ConcluirServicoInput): Promise<OrdemDeServico> {
    const ordem = await carregarOrdemOuFalhar(this.gateway, input.id);
    ordem.concluirServico(input.servicoId, input.horasTrabalhadas);
    const updated = await this.gateway.update(ordem);

    if (updated.status === 'FINALIZADA') {
      this.events.publish(
        new OsFinalizadaEvent(updated.id!, updated.numero, updated.clienteId),
      );
    }

    return updated;
  }
}
