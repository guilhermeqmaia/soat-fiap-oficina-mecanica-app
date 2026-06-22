import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { ServicoNotFoundError } from '../../domain/errors/servico-not-found.error';
import {
  SERVICO_GATEWAY,
  ServicoGateway,
} from '../gateways/servico.gateway';

export interface DeletarServicoInput {
  id: string;
}

@Injectable()
export class DeletarServicoUseCase
  implements UseCase<DeletarServicoInput, void>
{
  constructor(
    @Inject(SERVICO_GATEWAY)
    private readonly gateway: ServicoGateway,
  ) {}

  async execute(input: DeletarServicoInput): Promise<void> {
    const servico = await this.gateway.findById(input.id);
    if (!servico) {
      throw new ServicoNotFoundError(input.id);
    }
    await this.gateway.delete(input.id);
  }
}
