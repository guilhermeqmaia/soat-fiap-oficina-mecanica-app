import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Veiculo } from '../../domain/veiculo.entity';
import { ClienteNotFoundError } from '../../domain/errors/cliente-not-found.error';
import {
  VEICULO_GATEWAY,
  VeiculoGateway,
} from '../gateways/veiculo.gateway';
import {
  CLIENTE_CONSULTA_GATEWAY,
  ClienteConsultaGateway,
} from '../gateways/cliente-consulta.gateway';

export interface ListarVeiculosPorClienteInput {
  clienteId: string;
}

@Injectable()
export class ListarVeiculosPorClienteUseCase
  implements UseCase<ListarVeiculosPorClienteInput, Veiculo[]>
{
  constructor(
    @Inject(VEICULO_GATEWAY)
    private readonly gateway: VeiculoGateway,
    @Inject(CLIENTE_CONSULTA_GATEWAY)
    private readonly clienteGateway: ClienteConsultaGateway,
  ) {}

  async execute(input: ListarVeiculosPorClienteInput): Promise<Veiculo[]> {
    const cliente = await this.clienteGateway.findById(input.clienteId);
    if (!cliente) {
      throw new ClienteNotFoundError(input.clienteId);
    }

    return this.gateway.findByClienteId(input.clienteId);
  }
}
