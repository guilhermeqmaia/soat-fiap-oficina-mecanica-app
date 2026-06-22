import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import { ItemServicoOS } from '../../domain/value-objects/item-servico-os.vo';
import { ServicoNotFoundInCatalogError } from '../../domain/errors/servico-not-found-in-catalog.error';
import {
  ORDEM_DE_SERVICO_GATEWAY,
  OrdemDeServicoGateway,
} from '../gateways/ordem-de-servico.gateway';
import {
  SERVICO_CONSULTA_GATEWAY,
  ServicoConsultaGateway,
} from '../gateways/consulta.gateways';
import { carregarOrdemOuFalhar } from './carregar-ordem';

export interface AdicionarServicoInput {
  id: string;
  servicoId: string;
  quantidade: number;
}

@Injectable()
export class AdicionarServicoUseCase
  implements UseCase<AdicionarServicoInput, OrdemDeServico>
{
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
    @Inject(SERVICO_CONSULTA_GATEWAY)
    private readonly servicoGateway: ServicoConsultaGateway,
  ) {}

  async execute(input: AdicionarServicoInput): Promise<OrdemDeServico> {
    const ordem = await carregarOrdemOuFalhar(this.gateway, input.id);

    const servico = await this.servicoGateway.findById(input.servicoId);
    if (!servico) {
      throw new ServicoNotFoundInCatalogError(input.servicoId);
    }

    const item = new ItemServicoOS(
      input.servicoId,
      input.quantidade,
      servico.precoBase.value,
    );
    ordem.adicionarServico(item);
    return this.gateway.update(ordem);
  }
}
