import { Inject, Injectable } from '@nestjs/common';
import { UseCase, DOMAIN_EVENT_PUBLISHER, DomainEventPublisher } from '@guilhermeqmaia/oficina-kit/core';
import { OrdemDeServico } from '../../../domain/ordem-de-servico.entity';
import { StatusOS } from '../../../domain/value-objects/status-os.vo';
import { ORDEM_DE_SERVICO_GATEWAY, OrdemDeServicoGateway } from '../../gateways/ordem-de-servico.gateway';
import { registrarTransicao } from './registrar-transicao.base';

export interface RegistrarOrcamentoAprovadoInput {
  numero: string;
  /** Unit of work do orquestrador (OS + saga + outbox na mesma transacao). */
  tx?: unknown;
}

/** `billing.orcamento-aprovado` -> AGUARDANDO_PAGAMENTO (ADR-0012). */
@Injectable()
export class RegistrarOrcamentoAprovadoUseCase implements UseCase<RegistrarOrcamentoAprovadoInput, OrdemDeServico> {
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY) private readonly gateway: OrdemDeServicoGateway,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly events: DomainEventPublisher,
  ) {}

  async execute(input: RegistrarOrcamentoAprovadoInput): Promise<OrdemDeServico> {
    const { ordem } = await registrarTransicao(this.gateway, this.events, input.numero, StatusOS.AGUARDANDO_PAGAMENTO, (os) =>
      os.aguardarPagamento(),
      input.tx
    );
    return ordem;
  }
}
