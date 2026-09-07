import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import {
  DOMAIN_EVENT_PUBLISHER,
  DomainEventPublisher,
} from '../../../shared/application/domain-event-publisher';
import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import {
  ORDEM_DE_SERVICO_GATEWAY,
  OrdemDeServicoGateway,
} from '../gateways/ordem-de-servico.gateway';
import {
  CLIENTE_CONSULTA_GATEWAY,
  ClienteConsultaGateway,
} from '../gateways/consulta.gateways';
import { carregarOrdemOuFalhar } from './carregar-ordem';
import { assertOsPertenceAoCliente } from './assert-os-pertence-ao-cliente';
import { publicarMudancaDeStatus } from './publicar-mudanca-de-status';

export interface AprovarOrcamentoInput {
  id: string;
  /** CPF/CNPJ da claim do token quando a acao parte do proprio cliente. */
  cpfCnpjClienteAutenticado?: string;
}

@Injectable()
export class AprovarOrcamentoUseCase
  implements UseCase<AprovarOrcamentoInput, OrdemDeServico>
{
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
    @Inject(CLIENTE_CONSULTA_GATEWAY)
    private readonly clienteGateway: ClienteConsultaGateway,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly events: DomainEventPublisher,
  ) {}

  async execute(input: AprovarOrcamentoInput): Promise<OrdemDeServico> {
    if (input.cpfCnpjClienteAutenticado) {
      await assertOsPertenceAoCliente(
        this.gateway,
        this.clienteGateway,
        input.id,
        input.cpfCnpjClienteAutenticado,
      );
    }
    const ordem = await carregarOrdemOuFalhar(this.gateway, input.id);
    const statusAnterior = ordem.status;
    ordem.aprovar();
    const updated = await this.gateway.update(ordem);
    publicarMudancaDeStatus(this.events, updated, statusAnterior);
    return updated;
  }
}
