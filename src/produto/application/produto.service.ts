import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Produto,
  CreateProdutoProps,
  UpdateProdutoProps,
} from '../domain/produto.entity';
import {
  ProdutoRepository,
  PRODUTO_REPOSITORY,
  FindAllParams,
  PaginatedResult,
} from '../domain/produto.repository';
import { DuplicateNameError } from '../domain/errors/duplicate-name.error';
import { InsufficientStockError } from '../domain/errors/insufficient-stock.error';
import { MovimentacaoEstoque } from '../domain/movimentacao-estoque.entity';
import { TipoMovimentacaoEstoque } from '../domain/value-objects/tipo-movimentacao-estoque.vo';
import { EstoqueBaixoEvent } from '../domain/events/estoque-baixo.event';
import { MovimentacaoContext } from '../domain/movimentacao-context';
import {
  ESTOQUE_UNIT_OF_WORK,
  EstoqueUnitOfWork,
} from '../domain/estoque-unit-of-work';

// Re-export para nao quebrar imports existentes
export { MovimentacaoContext };

@Injectable()
export class ProdutoService {
  constructor(
    @Inject(PRODUTO_REPOSITORY)
    private readonly repository: ProdutoRepository,
    @Inject(ESTOQUE_UNIT_OF_WORK)
    private readonly uow: EstoqueUnitOfWork,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(props: CreateProdutoProps): Promise<Produto> {
    const exists = await this.repository.existsByNome(props.nome);
    if (exists) {
      throw new DuplicateNameError(props.nome);
    }

    const produto = Produto.create(props);
    return this.repository.create(produto);
  }

  async findAll(params: FindAllParams): Promise<PaginatedResult<Produto>> {
    return this.repository.findAll(params);
  }

  async findById(id: string): Promise<Produto> {
    const produto = await this.repository.findById(id);
    if (!produto) {
      throw new NotFoundException(`Produto com id '${id}' nao encontrado`);
    }
    return produto;
  }

  async findLowStock(): Promise<Produto[]> {
    return this.repository.findLowStock();
  }

  async update(id: string, props: UpdateProdutoProps): Promise<Produto> {
    const produto = await this.repository.findById(id);
    if (!produto) {
      throw new NotFoundException(`Produto com id '${id}' nao encontrado`);
    }

    if (props.nome !== undefined) {
      const exists = await this.repository.existsByNome(props.nome, id);
      if (exists) {
        throw new DuplicateNameError(props.nome);
      }
    }

    produto.update(props);
    return this.repository.update(produto);
  }

  async delete(id: string): Promise<void> {
    const produto = await this.repository.findById(id);
    if (!produto) {
      throw new NotFoundException(`Produto com id '${id}' nao encontrado`);
    }
    await this.repository.delete(id);
  }

  async addStock(
    id: string,
    quantity: number,
    ctx: MovimentacaoContext = {},
  ): Promise<Produto> {
    const produto = await this.findById(id);
    produto.addStock(quantity);
    return this.persistirComMovimentacao(
      produto,
      TipoMovimentacaoEstoque.ENTRADA,
      quantity,
      ctx,
    );
  }

  async removeStock(
    id: string,
    quantity: number,
    ctx: MovimentacaoContext = {},
  ): Promise<Produto> {
    const produto = await this.findById(id);
    if (quantity > produto.quantidadeDisponivel) {
      throw new InsufficientStockError(
        produto.nome,
        quantity,
        produto.quantidadeDisponivel,
      );
    }
    produto.deduct(quantity);
    const updated = await this.persistirComMovimentacao(
      produto,
      TipoMovimentacaoEstoque.SAIDA,
      quantity,
      ctx,
    );
    this.maybeEmitEstoqueBaixo(updated);
    return updated;
  }

  async reserveStock(
    id: string,
    quantity: number,
    ctx: MovimentacaoContext = {},
  ): Promise<Produto> {
    const produto = await this.findById(id);
    produto.reserve(quantity);
    return this.persistirComMovimentacao(
      produto,
      TipoMovimentacaoEstoque.RESERVA,
      quantity,
      ctx,
    );
  }

  async releaseStock(
    id: string,
    quantity: number,
    ctx: MovimentacaoContext = {},
  ): Promise<Produto> {
    const produto = await this.findById(id);
    produto.release(quantity);
    return this.persistirComMovimentacao(
      produto,
      TipoMovimentacaoEstoque.ESTORNO_RESERVA,
      quantity,
      ctx,
    );
  }

  async deductStock(
    id: string,
    quantity: number,
    ctx: MovimentacaoContext = {},
  ): Promise<Produto> {
    const produto = await this.findById(id);
    produto.deduct(quantity);
    const updated = await this.persistirComMovimentacao(
      produto,
      TipoMovimentacaoEstoque.BAIXA,
      quantity,
      ctx,
    );
    this.maybeEmitEstoqueBaixo(updated);
    return updated;
  }

  /**
   * Persiste produto + registra movimentacao numa unica transacao via UoW.
   * Garante que o estado do estoque e o historico de auditoria estao sempre
   * em sincronia (atomicidade).
   */
  private async persistirComMovimentacao(
    produto: Produto,
    tipo: TipoMovimentacaoEstoque,
    quantidade: number,
    ctx: MovimentacaoContext,
  ): Promise<Produto> {
    const movimentacao = MovimentacaoEstoque.create({
      produtoId: produto.id!,
      tipo,
      quantidade,
      estoqueResultante: produto.quantidadeEstoque,
      ordemDeServicoId: ctx.ordemDeServicoId,
      motivo: ctx.motivo,
      usuarioId: ctx.usuarioId,
    });
    const result = await this.uow.persistirAtualizacaoComMovimentacao(
      produto,
      movimentacao,
    );
    return result.produto;
  }

  private maybeEmitEstoqueBaixo(produto: Produto): void {
    if (produto.isLowStock()) {
      this.eventEmitter.emit(
        EstoqueBaixoEvent.EVENT_NAME,
        new EstoqueBaixoEvent(
          produto.id!,
          produto.nome,
          produto.quantidadeEstoque,
          produto.estoqueMinimo,
        ),
      );
    }
  }
}
