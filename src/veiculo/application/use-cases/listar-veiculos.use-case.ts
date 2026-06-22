import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Veiculo } from '../../domain/veiculo.entity';
import {
  VEICULO_GATEWAY,
  VeiculoGateway,
  FindAllParams,
  PaginatedResult,
} from '../gateways/veiculo.gateway';

export type ListarVeiculosInput = FindAllParams;

@Injectable()
export class ListarVeiculosUseCase
  implements UseCase<ListarVeiculosInput, PaginatedResult<Veiculo>>
{
  constructor(
    @Inject(VEICULO_GATEWAY)
    private readonly gateway: VeiculoGateway,
  ) {}

  execute(input: ListarVeiculosInput): Promise<PaginatedResult<Veiculo>> {
    return this.gateway.findAll(input);
  }
}
