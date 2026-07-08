import { Inject, Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import { StatusOS } from '../../domain/value-objects/status-os.vo';
import {
  ORDEM_DE_SERVICO_GATEWAY,
  OrdemDeServicoGateway,
} from '../gateways/ordem-de-servico.gateway';
import {
  ESTOQUE_MOVIMENTO_GATEWAY,
  EstoqueMovimentoGateway,
} from '../gateways/estoque-movimento.gateway';
import { carregarOrdemOuFalhar } from './carregar-ordem';

export interface DeletarOrdemDeServicoInput {
  id: string;
}

/**
 * Status em que as pecas da OS estao RESERVADAS mas ainda nao foram baixadas
 * (a baixa ocorre ao entrar em EM_EXECUCAO). Deletar uma OS nesses status deve
 * estornar as reservas para nao vazar estoque. Em EM_EXECUCAO+ o estoque ja foi
 * baixado, e em CANCELADA ja foi estornado pelo OsEstoqueListener.
 */
const STATUS_COM_RESERVA_ATIVA = new Set<StatusOS>([
  StatusOS.RECEBIDA,
  StatusOS.EM_DIAGNOSTICO,
  StatusOS.AGUARDANDO_APROVACAO,
]);

@Injectable()
export class DeletarOrdemDeServicoUseCase
  implements UseCase<DeletarOrdemDeServicoInput, void>
{
  private readonly logger = new Logger(DeletarOrdemDeServicoUseCase.name);

  constructor(
    @Inject(ORDEM_DE_SERVICO_GATEWAY)
    private readonly gateway: OrdemDeServicoGateway,
    @Inject(ESTOQUE_MOVIMENTO_GATEWAY)
    private readonly estoque: EstoqueMovimentoGateway,
  ) {}

  async execute(input: DeletarOrdemDeServicoInput): Promise<void> {
    const ordem = await carregarOrdemOuFalhar(this.gateway, input.id);

    if (STATUS_COM_RESERVA_ATIVA.has(ordem.status)) {
      await this.estornarReservas(ordem);
    }

    await this.gateway.delete(ordem.id);
  }

  private async estornarReservas(ordem: OrdemDeServico): Promise<void> {
    for (const { produto } of ordem.todosOsProdutos()) {
      try {
        await this.estoque.liberar(produto.produtoId, produto.quantidade, {
          ordemDeServicoId: ordem.id,
          usuarioId: ordem.usuarioId ?? undefined,
          motivo: `Estorno por exclusao da OS ${ordem.numero}`,
        });
      } catch (err) {
        this.logger.error(
          `Falha ao estornar reserva do produto ${produto.produtoId} ao excluir a OS ${ordem.numero}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }
  }
}
