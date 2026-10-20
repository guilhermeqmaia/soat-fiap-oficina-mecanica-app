import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '@guilhermeqmaia/oficina-kit/core';
import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import {
  ORDEM_DE_SERVICO_GATEWAY,
  OrdemDeServicoGateway,
} from '../gateways/ordem-de-servico.gateway';
import { carregarOrdemOuFalhar } from './carregar-ordem';

export interface IniciarServicoInput {
  id: string;
  servicoId: string;
}

@Injectable()
export class IniciarServicoUseCase
  implements UseCase<IniciarServicoInput, OrdemDeServico>
{
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
  ) {}

  async execute(input: IniciarServicoInput): Promise<OrdemDeServico> {
    const ordem = await carregarOrdemOuFalhar(this.gateway, input.id);
    ordem.iniciarServico(input.servicoId);
    return this.gateway.update(ordem);
  }
}
