import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import {
  ORDEM_DE_SERVICO_GATEWAY,
  OrdemDeServicoGateway,
} from '../gateways/ordem-de-servico.gateway';
import { carregarOrdemOuFalhar } from './carregar-ordem';

export interface BuscarOrdemDeServicoPorIdInput {
  id: string;
}

@Injectable()
export class BuscarOrdemDeServicoPorIdUseCase
  implements UseCase<BuscarOrdemDeServicoPorIdInput, OrdemDeServico>
{
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
  ) {}

  execute(input: BuscarOrdemDeServicoPorIdInput): Promise<OrdemDeServico> {
    return carregarOrdemOuFalhar(this.gateway, input.id);
  }
}
