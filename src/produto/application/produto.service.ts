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
import { MovimentacaoEstoque } from '../domain/movimentacao-estoque.entity';
import {
  MOVIMENTACAO_ESTOQUE_REPOSITORY,
  MovimentacaoEstoqueRepository,
} from '../domain/movimentacao-estoque.repository';
import { TipoMovimentacaoEstoque } from '../domain/value-objects/tipo-movimentacao-estoque.vo';
import { EstoqueBaixoEvent } from '../domain/events/estoque-baixo.event';

export interface MovimentacaoContext {
  ordemDeServicoId?: string;
  motivo?: string;
  usuarioId?: string;
}

@Injectable()
export class ProdutoService {
  constructor(
    @Inject(PRODUTO_REPOSITORY)
    private readonly repository: ProdutoRepository,
    @Inject(MOVIMENTACAO_ESTOQUE_REPOSITORY)
    private readonly movimentacaoRepository: MovimentacaoEstoqueRepository,
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
    const all = await this.repository.findAll({ page: 1, limit: 1000 });
    return all.data.filter((p) => p.ativo && p.isLowStock());
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
    const updated = await this.repository.update(produto);
    await this.registrarMovimentacao(
      updated,
      TipoMovimentacaoEstoque.ENTRADA,
      quantity,
      ctx,
    );
    return updated;
  }

  async removeStock(
    id: string,
    quantity: number,
    ctx: MovimentacaoContext = {},
  ): Promise<Produto> {
    const produto = await this.findById(id);
    if (quantity > produto.quantidadeDisponivel) {
      throw new NotFoundException(
        `Quantidade ${quantity} excede o disponivel (${produto.quantidadeDisponivel})`,
      );
    }
    produto.deduct(quantity);
    const updated = await this.repository.update(produto);
    await this.registrarMovimentacao(
      updated,
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
    const updated = await this.repository.update(produto);
    await this.registrarMovimentacao(
      updated,
      TipoMovimentacaoEstoque.RESERVA,
      quantity,
      ctx,
    );
    return updated;
  }

  async releaseStock(
    id: string,
    quantity: number,
    ctx: MovimentacaoContext = {},
  ): Promise<Produto> {
    const produto = await this.findById(id);
    produto.release(quantity);
    const updated = await this.repository.update(produto);
    await this.registrarMovimentacao(
      updated,
      TipoMovimentacaoEstoque.ESTORNO_RESERVA,
      quantity,
      ctx,
    );
    return updated;
  }

  async deductStock(
    id: string,
    quantity: number,
    ctx: MovimentacaoContext = {},
  ): Promise<Produto> {
    const produto = await this.findById(id);
    produto.deduct(quantity);
    const updated = await this.repository.update(produto);
    await this.registrarMovimentacao(
      updated,
      TipoMovimentacaoEstoque.BAIXA,
      quantity,
      ctx,
    );
    this.maybeEmitEstoqueBaixo(updated);
    return updated;
  }

  private async registrarMovimentacao(
    produto: Produto,
    tipo: TipoMovimentacaoEstoque,
    quantidade: number,
    ctx: MovimentacaoContext,
  ): Promise<void> {
    const movimentacao = MovimentacaoEstoque.create({
      produtoId: produto.id!,
      tipo,
      quantidade,
      estoqueResultante: produto.quantidadeEstoque,
      ordemDeServicoId: ctx.ordemDeServicoId,
      motivo: ctx.motivo,
      usuarioId: ctx.usuarioId,
    });
    await this.movimentacaoRepository.create(movimentacao);
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
