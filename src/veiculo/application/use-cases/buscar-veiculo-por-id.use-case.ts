import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Veiculo } from '../../domain/veiculo.entity';
import { VeiculoNotFoundError } from '../../domain/errors/veiculo-not-found.error';
import {
  VEICULO_GATEWAY,
  VeiculoGateway,
} from '../gateways/veiculo.gateway';

export interface BuscarVeiculoPorIdInput {
  id: string;
}

@Injectable()
export class BuscarVeiculoPorIdUseCase
  implements UseCase<BuscarVeiculoPorIdInput, Veiculo>
{
  constructor(
    @Inject(VEICULO_GATEWAY)
    private readonly gateway: VeiculoGateway,
  ) {}

  async execute(input: BuscarVeiculoPorIdInput): Promise<Veiculo> {
    const veiculo = await this.gateway.findById(input.id);
    if (!veiculo) {
      throw new VeiculoNotFoundError(input.id);
    }
    return veiculo;
  }
}
