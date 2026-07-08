import { Inject, Injectable, Logger } from '@nestjs/common';
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
import {
  ESTOQUE_MOVIMENTO_GATEWAY,
  EstoqueMovimentoGateway,
} from '../gateways/estoque-movimento.gateway';
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
  private readonly logger = new Logger(AdicionarProdutoAoServicoUseCase.name);

  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
    @Inject(PRODUTO_CONSULTA_GATEWAY)
    private readonly produtoGateway: ProdutoConsultaGateway,
    @Inject(ESTOQUE_MOVIMENTO_GATEWAY)
    private readonly estoque: EstoqueMovimentoGateway,
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
    // Valida o estado da OS em memoria (lanca se transicao invalida) ANTES de
    // tocar o estoque, para nao reservar sem conseguir adicionar o item.
    ordem.adicionarProdutoAoServico(input.servicoId, item);

    const ctx = {
      ordemDeServicoId: ordem.id,
      motivo: `Reserva para OS ${ordem.numero}`,
      usuarioId: ordem.usuarioId ?? undefined,
    };

    // Reserva o estoque: se nao houver disponivel, lanca InsufficientStockError
    // e a OS nao e persistida (a mutacao acima ficou apenas em memoria).
    await this.estoque.reservar(input.produtoId, input.quantidade, ctx);

    try {
      return await this.gateway.update(ordem);
    } catch (err) {
      // Compensacao: a reserva foi commitada em transacao propria; se o update
      // da OS falhar, estorna a reserva para nao deixar estoque orfao.
      await this.compensarReserva(input.produtoId, input.quantidade, ctx);
      throw err;
    }
  }

  private async compensarReserva(
    produtoId: string,
    quantidade: number,
    ctx: { ordemDeServicoId?: string; motivo?: string; usuarioId?: string },
  ): Promise<void> {
    try {
      await this.estoque.liberar(produtoId, quantidade, ctx);
    } catch (err) {
      this.logger.error(
        `Falha ao compensar reserva do produto ${produtoId} apos erro ao persistir a OS: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }
}
