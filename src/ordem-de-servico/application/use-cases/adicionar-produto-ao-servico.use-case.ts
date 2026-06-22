import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import { ItemProdutoOS } from '../../domain/value-objects/item-produto-os.vo';
import { ProdutoNotFoundInCatalogError } from '../../domain/errors/produto-not-found-in-catalog.error';
import {
  ORDEM_DE_SERVICO_GATEWAY,
  OrdemDeServicoGateway,
} from '../gateways/ordem-de-servico.gateway';
import {
  PRODUTO_CONSULTA_GATEWAY,
  ProdutoConsultaGateway,
} from '../gateways/consulta.gateways';
import { carregarOrdemOuFalhar } from './carregar-ordem';

export interface AdicionarProdutoAoServicoInput {
  id: string;
  servicoId: string;
  produtoId: string;
  quantidade: number;
}

@Injectable()
export class AdicionarProdutoAoServicoUseCase
  implements UseCase<AdicionarProdutoAoServicoInput, OrdemDeServico>
{
  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
    @Inject(PRODUTO_CONSULTA_GATEWAY)
    private readonly produtoGateway: ProdutoConsultaGateway,
  ) {}

  async execute(
    input: AdicionarProdutoAoServicoInput,
  ): Promise<OrdemDeServico> {
    const ordem = await carregarOrdemOuFalhar(this.gateway, input.id);

    const produto = await this.produtoGateway.findById(input.produtoId);
    if (!produto) {
      throw new ProdutoNotFoundInCatalogError(input.produtoId);
    }

    const item = new ItemProdutoOS(
      input.produtoId,
      input.quantidade,
      produto.precoUnitario.value,
    );
    ordem.adicionarProdutoAoServico(input.servicoId, item);
    return this.gateway.update(ordem);
  }
}
