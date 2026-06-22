import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import { ClienteNotFoundError } from '../../domain/errors/cliente-not-found.error';
import { VeiculoNotFoundError } from '../../domain/errors/veiculo-not-found.error';
import { VeiculoClienteMismatchError } from '../../domain/errors/veiculo-cliente-mismatch.error';
import {
  ORDEM_DE_SERVICO_GATEWAY,
  OrdemDeServicoGateway,
} from '../gateways/ordem-de-servico.gateway';
import {
  CLIENTE_CONSULTA_GATEWAY,
  ClienteConsultaGateway,
  VEICULO_CONSULTA_GATEWAY,
  VeiculoConsultaGateway,
} from '../gateways/consulta.gateways';

export interface CriarOrdemDeServicoInput {
  clienteId: string;
  veiculoId: string;
  descricaoInicial: string;
}

@Injectable()
export class CriarOrdemDeServicoUseCase
  implements UseCase<CriarOrdemDeServicoInput, OrdemDeServico>
{
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
    @Inject(CLIENTE_CONSULTA_GATEWAY)
    private readonly clienteGateway: ClienteConsultaGateway,
    @Inject(VEICULO_CONSULTA_GATEWAY)
    private readonly veiculoGateway: VeiculoConsultaGateway,
  ) {}

  async execute(input: CriarOrdemDeServicoInput): Promise<OrdemDeServico> {
    const cliente = await this.clienteGateway.findById(input.clienteId);
    if (!cliente) {
      throw new ClienteNotFoundError(input.clienteId);
    }

    const veiculo = await this.veiculoGateway.findById(input.veiculoId);
    if (!veiculo) {
      throw new VeiculoNotFoundError(input.veiculoId);
    }

    if (veiculo.clienteId !== input.clienteId) {
      throw new VeiculoClienteMismatchError(input.veiculoId, input.clienteId);
    }

    const ordem = OrdemDeServico.create({
      clienteId: input.clienteId,
      veiculoId: input.veiculoId,
      descricaoInicial: input.descricaoInicial,
    });

    return this.gateway.create(ordem);
  }
}
