import { Inject, Injectable } from '@nestjs/common';
import { UseCase, DOMAIN_EVENT_PUBLISHER, DomainEventPublisher } from '@guilhermeqmaia/oficina-kit/core';
import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import { MotivoCancelamento } from '../../domain/value-objects/motivo-cancelamento';
import { ORDEM_DE_SERVICO_GATEWAY, OrdemDeServicoGateway } from '../gateways/ordem-de-servico.gateway';
import { carregarOrdemOuFalhar } from './carregar-ordem';
import { publicarMudancaDeStatus } from './publicar-mudanca-de-status';

export interface CancelarOrdemDeServicoInput {
  id: string;
  motivo?: MotivoCancelamento;
}

/** Cancelamento manual pelo atendente (motivo OPERADOR); so antes da execucao. */
@Injectable()
export class CancelarOrdemDeServicoUseCase implements UseCase<CancelarOrdemDeServicoInput, OrdemDeServico> {
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly events: DomainEventPublisher,
  ) {}

  async execute(input: CancelarOrdemDeServicoInput): Promise<OrdemDeServico> {
    const ordem = await carregarOrdemOuFalhar(this.gateway, input.id);
    const statusAnterior = ordem.status;
    const entradaNoStatusAnterior = ordem.updatedAt ?? ordem.createdAt;
    ordem.cancelar(input.motivo ?? MotivoCancelamento.OPERADOR);
    const updated = await this.gateway.update(ordem);
    publicarMudancaDeStatus(this.events, updated, statusAnterior, entradaNoStatusAnterior);
    return updated;
  }
}
