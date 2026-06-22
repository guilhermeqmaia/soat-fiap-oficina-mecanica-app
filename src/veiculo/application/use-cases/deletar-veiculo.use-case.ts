import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { VeiculoNotFoundError } from '../../domain/errors/veiculo-not-found.error';
import {
  VEICULO_GATEWAY,
  VeiculoGateway,
} from '../gateways/veiculo.gateway';

export interface DeletarVeiculoInput {
  id: string;
}

@Injectable()
export class DeletarVeiculoUseCase implements UseCase<DeletarVeiculoInput, void> {
  constructor(
    @Inject(VEICULO_GATEWAY)
    private readonly gateway: VeiculoGateway,
  ) {}

  async execute(input: DeletarVeiculoInput): Promise<void> {
    const veiculo = await this.gateway.findById(input.id);
    if (!veiculo) {
      throw new VeiculoNotFoundError(input.id);
    }
    await this.gateway.delete(input.id);
  }
}
