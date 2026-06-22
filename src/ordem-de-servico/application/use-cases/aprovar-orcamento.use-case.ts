import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
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

export interface AprovarOrcamentoInput {
  id: string;
  /** Quando a acao parte do proprio cliente, valida posse da OS. */
  emailClienteAutenticado?: string;
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
  ) {}

  async execute(input: AprovarOrcamentoInput): Promise<OrdemDeServico> {
    if (input.emailClienteAutenticado) {
      await assertOsPertenceAoCliente(
        this.gateway,
        this.clienteGateway,
        input.id,
        input.emailClienteAutenticado,
      );
    }
    const ordem = await carregarOrdemOuFalhar(this.gateway, input.id);
    ordem.aprovar();
    return this.gateway.update(ordem);
  }
}
