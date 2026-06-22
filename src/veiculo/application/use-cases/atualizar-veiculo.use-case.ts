import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Veiculo } from '../../domain/veiculo.entity';
import { VeiculoNotFoundError } from '../../domain/errors/veiculo-not-found.error';
import { DuplicatePlacaError } from '../../domain/errors/duplicate-placa.error';
import {
  VEICULO_GATEWAY,
  VeiculoGateway,
} from '../gateways/veiculo.gateway';

export interface AtualizarVeiculoInput {
  id: string;
  placa?: string;
  marca?: string;
  modelo?: string;
  ano?: number;
}

@Injectable()
export class AtualizarVeiculoUseCase
  implements UseCase<AtualizarVeiculoInput, Veiculo>
{
  constructor(
    @Inject(VEICULO_GATEWAY)
    private readonly gateway: VeiculoGateway,
  ) {}

  async execute(input: AtualizarVeiculoInput): Promise<Veiculo> {
    const veiculo = await this.gateway.findById(input.id);
    if (!veiculo) {
      throw new VeiculoNotFoundError(input.id);
    }

    if (input.placa !== undefined) {
      const exists = await this.gateway.existsByPlaca(input.placa, input.id);
      if (exists) {
        throw new DuplicatePlacaError(input.placa);
      }
    }

    veiculo.update({
      placa: input.placa,
      marca: input.marca,
      modelo: input.modelo,
      ano: input.ano,
    });

    return this.gateway.update(veiculo);
  }
}
