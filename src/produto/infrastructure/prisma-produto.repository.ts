import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Produto } from '../domain/produto.entity';
import { MovimentacaoEstoque } from '../domain/movimentacao-estoque.entity';
import { TipoMovimentacaoEstoque } from '../domain/value-objects/tipo-movimentacao-estoque.vo';
import {
  ProdutoRepository,
  FindAllParams,
  PaginatedResult,
} from '../domain/produto.repository';

@Injectable()
export class PrismaProdutoRepository implements ProdutoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsByNome(nome: string, excludeId?: string): Promise<boolean> {
    const record = await this.prisma.produto.findFirst({
      where: {
        nome: { equals: nome, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return record !== null;
  }

  async create(produto: Produto): Promise<Produto> {
    const record = await this.prisma.produto.create({
      data: {
        nome: produto.nome,
        descricao: produto.descricao ?? null,
        precoUnitario: produto.precoUnitario.value,
        quantidadeEstoque: produto.quantidadeEstoque,
        quantidadeReservada: produto.quantidadeReservada,
        estoqueMinimo: produto.estoqueMinimo,
        ativo: produto.ativo,
      },
    });

    return this.toDomain(record);
  }

  async findById(id: string): Promise<Produto | null> {
    const record = await this.prisma.produto.findUnique({ where: { id } });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findAll(params: FindAllParams): Promise<PaginatedResult<Produto>> {
    const { page, limit, nome } = params;
    const skip = (page - 1) * limit;

    const where = nome
      ? { nome: { contains: nome, mode: 'insensitive' as const } }
      : {};

    const [records, total] = await Promise.all([
      this.prisma.produto.findMany({ where, skip, take: limit, orderBy: { nome: 'asc' } }),
      this.prisma.produto.count({ where }),
    ]);

    return {
      data: records.map((r) => this.toDomain(r)),
      total,
      page,
      limit,
    };
  }

  async findLowStock(): Promise<Produto[]> {
    // Prisma nao suporta comparar duas colunas no where, entao usamos SQL raw.
    // Ordena pelos mais criticos primeiro (estoque mais abaixo do minimo).
    const records = await this.prisma.$queryRaw<
      Array<{
        id: string;
        nome: string;
        descricao: string | null;
        preco_unitario: unknown;
        quantidade_estoque: number;
        quantidade_reservada: number;
        estoque_minimo: number;
        ativo: boolean;
      }>
    >`
      SELECT id, nome, descricao, preco_unitario,
             quantidade_estoque, quantidade_reservada,
             estoque_minimo, ativo
      FROM produto
      WHERE ativo = true AND quantidade_estoque <= estoque_minimo
      ORDER BY (quantidade_estoque - estoque_minimo) ASC, nome ASC
    `;

    return records.map((r) =>
      Produto.reconstitute({
        id: r.id,
        nome: r.nome,
        descricao: r.descricao,
        precoUnitario: Number(r.preco_unitario),
        quantidadeEstoque: r.quantidade_estoque,
        quantidadeReservada: r.quantidade_reservada,
        estoqueMinimo: r.estoque_minimo,
        ativo: r.ativo,
      }),
    );
  }

  async update(produto: Produto): Promise<Produto> {
    const record = await this.prisma.produto.update({
      where: { id: produto.id },
      data: {
        nome: produto.nome,
        descricao: produto.descricao ?? null,
        precoUnitario: produto.precoUnitario.value,
        quantidadeEstoque: produto.quantidadeEstoque,
        quantidadeReservada: produto.quantidadeReservada,
        estoqueMinimo: produto.estoqueMinimo,
        ativo: produto.ativo,
      },
    });

    return this.toDomain(record);
  }

  async updateAndRecordMovimentacao(
    produto: Produto,
    movimentacao: MovimentacaoEstoque,
  ): Promise<{ produto: Produto; movimentacao: MovimentacaoEstoque }> {
    const [produtoRecord, movRecord] = await this.prisma.$transaction([
      this.prisma.produto.update({
        where: { id: produto.id },
        data: {
          nome: produto.nome,
          descricao: produto.descricao ?? null,
          precoUnitario: produto.precoUnitario.value,
          quantidadeEstoque: produto.quantidadeEstoque,
          quantidadeReservada: produto.quantidadeReservada,
          estoqueMinimo: produto.estoqueMinimo,
          ativo: produto.ativo,
        },
      }),
      this.prisma.movimentacaoEstoque.create({
        data: {
          produtoId: movimentacao.produtoId,
          tipo: movimentacao.tipo,
          quantidade: movimentacao.quantidade,
          estoqueResultante: movimentacao.estoqueResultante,
          ordemDeServicoId: movimentacao.ordemDeServicoId,
          motivo: movimentacao.motivo,
          usuarioId: movimentacao.usuarioId,
        },
      }),
    ]);

    return {
      produto: this.toDomain(produtoRecord),
      movimentacao: MovimentacaoEstoque.reconstitute({
        id: movRecord.id,
        produtoId: movRecord.produtoId,
        tipo: movRecord.tipo as TipoMovimentacaoEstoque,
        quantidade: movRecord.quantidade,
        estoqueResultante: movRecord.estoqueResultante,
        ordemDeServicoId: movRecord.ordemDeServicoId,
        motivo: movRecord.motivo,
        usuarioId: movRecord.usuarioId,
        createdAt: movRecord.createdAt,
      }),
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.produto.delete({ where: { id } });
  }

  private toDomain(record: {
    id: string;
    nome: string;
    descricao: string | null;
    precoUnitario: unknown;
    quantidadeEstoque: number;
    quantidadeReservada: number;
    estoqueMinimo: number;
    ativo: boolean;
  }): Produto {
    return Produto.reconstitute({
      id: record.id,
      nome: record.nome,
      descricao: record.descricao,
      precoUnitario: Number(record.precoUnitario),
      quantidadeEstoque: record.quantidadeEstoque,
      quantidadeReservada: record.quantidadeReservada,
      estoqueMinimo: record.estoqueMinimo,
      ativo: record.ativo,
    });
  }
}
