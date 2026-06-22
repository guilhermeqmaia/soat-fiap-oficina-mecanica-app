import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import {
  ORDEM_DE_SERVICO_GATEWAY,
  OrdemDeServicoGateway,
} from '../gateways/ordem-de-servico.gateway';
import { carregarOrdemOuFalhar } from './carregar-ordem';

export interface DeletarOrdemDeServicoInput {
  id: string;
}

@Injectable()
export class DeletarOrdemDeServicoUseCase
  implements UseCase<DeletarOrdemDeServicoInput, void>
{
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
  ) {}

  async execute(input: DeletarOrdemDeServicoInput): Promise<void> {
    const ordem = await carregarOrdemOuFalhar(this.gateway, input.id);
    await this.gateway.delete(ordem.id);
  }
}
