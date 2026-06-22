import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import {
  DOMAIN_EVENT_PUBLISHER,
  DomainEventPublisher,
} from '../../../shared/application/domain-event-publisher';
import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import { OrcamentoProntoEvent } from '../../domain/events/orcamento-pronto.event';
import {
  ORDEM_DE_SERVICO_GATEWAY,
  OrdemDeServicoGateway,
} from '../gateways/ordem-de-servico.gateway';
import { carregarOrdemOuFalhar } from './carregar-ordem';

export interface CompletarDiagnosticoInput {
  id: string;
  diagnostico: string;
}

@Injectable()
export class CompletarDiagnosticoUseCase
  implements UseCase<CompletarDiagnosticoInput, OrdemDeServico>
{
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly events: DomainEventPublisher,
  ) {}

  async execute(input: CompletarDiagnosticoInput): Promise<OrdemDeServico> {
    const ordem = await carregarOrdemOuFalhar(this.gateway, input.id);
    ordem.completarDiagnostico(input.diagnostico);
    const updated = await this.gateway.update(ordem);

    this.events.publish(
      new OrcamentoProntoEvent(
        updated.id!,
        updated.numero,
        updated.clienteId,
        updated.diagnostico ?? '',
        updated.valorTotalServicos(),
      ),
    );

    return updated;
  }
}
