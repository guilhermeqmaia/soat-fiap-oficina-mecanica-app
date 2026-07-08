import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OsStatusAlteradoEvent } from '../../domain/events/os-status-alterado.event';
import { StatusOS } from '../../domain/value-objects/status-os.vo';
import {
  ORDEM_DE_SERVICO_GATEWAY,
  OrdemDeServicoGateway,
} from '../gateways/ordem-de-servico.gateway';
import {
  ESTOQUE_MOVIMENTO_GATEWAY,
  EstoqueMovimentoGateway,
} from '../gateways/estoque-movimento.gateway';

/**
 * Policy de estoque orientada ao ciclo de vida da OS:
 * - OS entra em EM_EXECUCAO (orcamento aprovado) -> baixa definitiva do estoque
 *   dos produtos da OS.
 * - OS vai para CANCELADA a partir de AGUARDANDO_APROVACAO (orcamento reprovado)
 *   -> estorna as reservas dos produtos.
 *
 * Fire-and-forget (como os demais listeners): falhas sao logadas e nao quebram
 * o fluxo principal da OS. A reserva em si e sincrona no momento de adicionar o
 * produto (para bloquear falta de estoque) — ver AdicionarProdutoAoServicoUseCase.
 */
@Injectable()
export class OsEstoqueListener {
  private readonly logger = new Logger(OsEstoqueListener.name);

  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly ordemGateway: OrdemDeServicoGateway,
    @Inject(ESTOQUE_MOVIMENTO_GATEWAY)
    private readonly estoque: EstoqueMovimentoGateway,
  ) {}

  @OnEvent(OsStatusAlteradoEvent.EVENT_NAME)
  async handle(event: OsStatusAlteradoEvent): Promise<void> {
    const baixar = event.statusAtual === StatusOS.EM_EXECUCAO;
    const estornar =
      event.statusAtual === StatusOS.CANCELADA &&
      event.statusAnterior === StatusOS.AGUARDANDO_APROVACAO;

    if (!baixar && !estornar) {
      return;
    }

    try {
      const ordem = await this.ordemGateway.findById(event.ordemDeServicoId);
      if (!ordem) {
        return;
      }

      for (const { produto } of ordem.todosOsProdutos()) {
        const ctx = {
          ordemDeServicoId: ordem.id,
          usuarioId: ordem.usuarioId ?? undefined,
          motivo: baixar
            ? `Baixa na execucao da OS ${ordem.numero}`
            : `Estorno por reprovacao da OS ${ordem.numero}`,
        };

        if (baixar) {
          await this.estoque.baixar(produto.produtoId, produto.quantidade, ctx);
        } else {
          await this.estoque.liberar(
            produto.produtoId,
            produto.quantidade,
            ctx,
          );
        }
      }
    } catch (err) {
      this.logger.error(
        `Falha ao ${baixar ? 'baixar' : 'estornar'} estoque da OS ${event.numero}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }
}
