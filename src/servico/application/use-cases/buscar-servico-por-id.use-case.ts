import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Servico } from '../../domain/servico.entity';
import { ServicoNotFoundError } from '../../domain/errors/servico-not-found.error';
import {
  SERVICO_GATEWAY,
  ServicoGateway,
} from '../gateways/servico.gateway';

export interface BuscarServicoPorIdInput {
  id: string;
}

@Injectable()
export class BuscarServicoPorIdUseCase
  implements UseCase<BuscarServicoPorIdInput, Servico>
{
  constructor(
    @Inject(SERVICO_GATEWAY)
    private readonly gateway: ServicoGateway,
  ) {}

  async execute(input: BuscarServicoPorIdInput): Promise<Servico> {
    const servico = await this.gateway.findById(input.id);
    if (!servico) {
      throw new ServicoNotFoundError(input.id);
    }
    return servico;
  }
}
