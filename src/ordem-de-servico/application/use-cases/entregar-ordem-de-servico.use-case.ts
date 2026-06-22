import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import {
  ORDEM_DE_SERVICO_GATEWAY,
  OrdemDeServicoGateway,
} from '../gateways/ordem-de-servico.gateway';
import { carregarOrdemOuFalhar } from './carregar-ordem';

export interface EntregarOrdemDeServicoInput {
  id: string;
}

@Injectable()
export class EntregarOrdemDeServicoUseCase
  implements UseCase<EntregarOrdemDeServicoInput, OrdemDeServico>
{
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
  ) {}

  async execute(input: EntregarOrdemDeServicoInput): Promise<OrdemDeServico> {
    const ordem = await carregarOrdemOuFalhar(this.gateway, input.id);
    ordem.entregar();
    return this.gateway.update(ordem);
  }
}
