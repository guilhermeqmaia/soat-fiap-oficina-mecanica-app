import { Injectable } from '@nestjs/common';
import { ReservarEstoqueUseCase } from '../../produto/application/use-cases/reservar-estoque.use-case';
import { BaixarEstoqueUseCase } from '../../produto/application/use-cases/baixar-estoque.use-case';
import { LiberarEstoqueUseCase } from '../../produto/application/use-cases/liberar-estoque.use-case';
import {
  EstoqueMovimentoContext,
  EstoqueMovimentoGateway,
} from '../application/gateways/estoque-movimento.gateway';

/**
 * Adapter (infra) que satisfaz a porta EstoqueMovimentoGateway do contexto de
 * Atendimento delegando aos use cases do contexto de Estoque (exportados por
 * ProdutoModule). Concentra aqui o unico ponto de acoplamento entre os dois
 * contextos.
 */
@Injectable()
export class EstoqueMovimentoOsAdapter implements EstoqueMovimentoGateway {
  constructor(
    private readonly reservarUC: ReservarEstoqueUseCase,
    private readonly baixarUC: BaixarEstoqueUseCase,
    private readonly liberarUC: LiberarEstoqueUseCase,
  ) {}

  async reservar(
    produtoId: string,
    quantidade: number,
    ctx?: EstoqueMovimentoContext,
  ): Promise<void> {
    await this.reservarUC.execute({ id: produtoId, quantidade, ctx });
  }

  async baixar(
    produtoId: string,
    quantidade: number,
    ctx?: EstoqueMovimentoContext,
  ): Promise<void> {
    await this.baixarUC.execute({ id: produtoId, quantidade, ctx });
  }

  async liberar(
    produtoId: string,
    quantidade: number,
    ctx?: EstoqueMovimentoContext,
  ): Promise<void> {
    await this.liberarUC.execute({ id: produtoId, quantidade, ctx });
  }
}
