import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import {
  ORDEM_DE_SERVICO_GATEWAY,
  OrdemDeServicoGateway,
} from '../gateways/ordem-de-servico.gateway';
import { carregarOrdemOuFalhar } from './carregar-ordem';

export interface RemoverProdutoDoServicoInput {
  id: string;
  servicoId: string;
  produtoId: string;
}

@Injectable()
export class RemoverProdutoDoServicoUseCase
  implements UseCase<RemoverProdutoDoServicoInput, OrdemDeServico>
{
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
  ) {}

  async execute(input: RemoverProdutoDoServicoInput): Promise<OrdemDeServico> {
    const ordem = await carregarOrdemOuFalhar(this.gateway, input.id);
    ordem.removerProdutoDoServico(input.servicoId, input.produtoId);
    return this.gateway.update(ordem);
  }
}
