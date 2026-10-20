import { Inject, Injectable } from '@nestjs/common';
import { UseCase, DOMAIN_EVENT_PUBLISHER, DomainEventPublisher } from '@guilhermeqmaia/oficina-kit/core';
import { OrdemDeServico } from '../../../domain/ordem-de-servico.entity';
import { StatusOS } from '../../../domain/value-objects/status-os.vo';
import { OsFinalizadaEvent } from '../../../../shared/domain/events/os-finalizada.event';
import { ORDEM_DE_SERVICO_GATEWAY, OrdemDeServicoGateway } from '../../gateways/ordem-de-servico.gateway';
import { registrarTransicao } from './registrar-transicao.base';

export interface RegistrarExecucaoFinalizadaInput {
  numero: string;
}

/** `execucao.finalizada` -> FINALIZADA + notificacao "veiculo pronto". */
@Injectable()
export class RegistrarExecucaoFinalizadaUseCase implements UseCase<RegistrarExecucaoFinalizadaInput, OrdemDeServico> {
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY) private readonly gateway: OrdemDeServicoGateway,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(input: RegistrarExecucaoFinalizadaInput): Promise<OrdemDeServico> {
    const { ordem, aplicada } = await registrarTransicao(this.gateway, this.events, input.numero, StatusOS.FINALIZADA, (os) =>
      os.finalizar(),
    );
    if (aplicada && ordem.id) {
      this.events.publish(new OsFinalizadaEvent(ordem.id, ordem.numero, ordem.clienteId));
    }
    return ordem;
  }
}
