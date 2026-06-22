import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Veiculo } from '../../domain/veiculo.entity';
import { ClienteNotFoundError } from '../../domain/errors/cliente-not-found.error';
import { DuplicatePlacaError } from '../../domain/errors/duplicate-placa.error';
import {
  VEICULO_GATEWAY,
  VeiculoGateway,
} from '../gateways/veiculo.gateway';
import {
  CLIENTE_CONSULTA_GATEWAY,
  ClienteConsultaGateway,
} from '../gateways/cliente-consulta.gateway';

export interface CriarVeiculoInput {
  placa: string;
  marca: string;
  modelo: string;
  ano: number;
  clienteId: string;
}

@Injectable()
export class CriarVeiculoUseCase implements UseCase<CriarVeiculoInput, Veiculo> {
  constructor(
    @Inject(VEICULO_GATEWAY)
    private readonly gateway: VeiculoGateway,
    @Inject(CLIENTE_CONSULTA_GATEWAY)
    private readonly clienteGateway: ClienteConsultaGateway,
  ) {}

  async execute(input: CriarVeiculoInput): Promise<Veiculo> {
    const cliente = await this.clienteGateway.findById(input.clienteId);
    if (!cliente) {
      throw new ClienteNotFoundError(input.clienteId);
    }

    const exists = await this.gateway.existsByPlaca(input.placa);
    if (exists) {
      throw new DuplicatePlacaError(input.placa);
    }

    const veiculo = Veiculo.create({
      placa: input.placa,
      marca: input.marca,
      modelo: input.modelo,
      ano: input.ano,
      clienteId: input.clienteId,
    });

    return this.gateway.create(veiculo);
  }
}
