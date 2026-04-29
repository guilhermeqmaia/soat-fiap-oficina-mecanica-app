import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MovimentacaoEstoque } from '../domain/movimentacao-estoque.entity';
import {
  FindMovimentacoesParams,
  MovimentacaoEstoqueRepository,
  PaginatedResult,
} from '../domain/movimentacao-estoque.repository';
import { TipoMovimentacaoEstoque } from '../domain/value-objects/tipo-movimentacao-estoque.vo';

interface MovimentacaoRecord {
  id: string;
  produtoId: string;
  tipo: string;
  quantidade: number;
  estoqueResultante: number;
  ordemDeServicoId: string | null;
  motivo: string | null;
  usuarioId: string | null;
  createdAt: Date;
}

@Injectable()
export class PrismaMovimentacaoEstoqueRepository
  implements MovimentacaoEstoqueRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async create(
    movimentacao: MovimentacaoEstoque,
  ): Promise<MovimentacaoEstoque> {
    const record = await this.prisma.movimentacaoEstoque.create({
      data: {
        produtoId: movimentacao.produtoId,
        tipo: movimentacao.tipo,
        quantidade: movimentacao.quantidade,
        estoqueResultante: movimentacao.estoqueResultante,
        ordemDeServicoId: movimentacao.ordemDeServicoId,
        motivo: movimentacao.motivo,
        usuarioId: movimentacao.usuarioId,
      },
    });
    return this.toDomain(record);
  }

  async findAll(
    params: FindMovimentacoesParams,
  ): Promise<PaginatedResult<MovimentacaoEstoque>> {
    const { page, limit, produtoId, ordemDeServicoId, tipo } = params;
    const skip = (page - 1) * limit;
    const where = {
      ...(produtoId ? { produtoId } : {}),
      ...(ordemDeServicoId ? { ordemDeServicoId } : {}),
      ...(tipo ? { tipo } : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.movimentacaoEstoque.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.movimentacaoEstoque.count({ where }),
    ]);

    return {
      data: records.map((r) => this.toDomain(r)),
      total,
      page,
      limit,
    };
  }

  private toDomain(record: MovimentacaoRecord): MovimentacaoEstoque {
    return MovimentacaoEstoque.reconstitute({
      id: record.id,
      produtoId: record.produtoId,
      tipo: record.tipo as TipoMovimentacaoEstoque,
      quantidade: record.quantidade,
      estoqueResultante: record.estoqueResultante,
      ordemDeServicoId: record.ordemDeServicoId,
      motivo: record.motivo,
      usuarioId: record.usuarioId,
      createdAt: record.createdAt,
    });
  }
}
