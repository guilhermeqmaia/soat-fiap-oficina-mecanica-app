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

export interface FinalizarExecucaoInput {
  id: string;
}

@Injectable()
export class FinalizarExecucaoUseCase
  implements UseCase<FinalizarExecucaoInput, OrdemDeServico>
{
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly events: DomainEventPublisher,
  ) {}

  async execute(input: FinalizarExecucaoInput): Promise<OrdemDeServico> {
    const ordem = await carregarOrdemOuFalhar(this.gateway, input.id);
    ordem.finalizarExecucao();
    const updated = await this.gateway.update(ordem);

    this.events.publish(
      new OsFinalizadaEvent(updated.id!, updated.numero, updated.clienteId),
    );

    return updated;
  }
}
