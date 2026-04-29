import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OrdemDeServicoRepository,
  FindAllParams,
  PaginatedResult,
} from '../domain/ordem-de-servico.repository';
import { OrdemDeServico } from '../domain/ordem-de-servico.entity';
import { StatusOS } from '../domain/value-objects/status-os.vo';
import {
  ItemServicoOS,
  StatusExecucaoItem,
} from '../domain/value-objects/item-servico-os.vo';
import { ItemProdutoOS } from '../domain/value-objects/item-produto-os.vo';

const INCLUDE_ITENS = { itensServico: true, itensProduto: true } as const;

@Injectable()
export class PrismaOrdemDeServicoRepository
  implements OrdemDeServicoRepository
{
  constructor(private prisma: PrismaService) {}

  async create(os: OrdemDeServico): Promise<OrdemDeServico> {
    const data = await this.prisma.ordemDeServico.create({
      data: {
        numero: os.numero,
        clienteId: os.clienteId,
        veiculoId: os.veiculoId,
        usuarioId: os.usuarioId,
        descricaoInicial: os.descricaoInicial,
        diagnostico: os.diagnostico,
        status: os.status,
      },
      include: INCLUDE_ITENS,
    });
    return this.toDomain(data);
  }

  async findById(id: string): Promise<OrdemDeServico | null> {
    const data = await this.prisma.ordemDeServico.findUnique({
      where: { id },
      include: INCLUDE_ITENS,
    });
    return data ? this.toDomain(data) : null;
  }

  async findAll(
    params: FindAllParams,
  ): Promise<PaginatedResult<OrdemDeServico>> {
    const skip = ((params.page ?? 1) - 1) * (params.limit ?? 10);

    const where: any = {};
    if (params.clienteId) where.clienteId = params.clienteId;
    if (params.status) where.status = params.status;
    if (params.numero) where.numero = { contains: params.numero, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.ordemDeServico.findMany({
        where,
        skip,
        take: params.limit ?? 10,
        orderBy: { createdAt: 'desc' },
        include: INCLUDE_ITENS,
      }),
      this.prisma.ordemDeServico.count({ where }),
    ]);

    return {
      data: data.map((d) => this.toDomain(d)),
      total,
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    };
  }

  async findByNumero(numero: string): Promise<OrdemDeServico | null> {
    const data = await this.prisma.ordemDeServico.findUnique({
      where: { numero },
      include: INCLUDE_ITENS,
    });
    return data ? this.toDomain(data) : null;
  }

  async update(os: OrdemDeServico): Promise<OrdemDeServico> {
    const data = await this.prisma.$transaction(async (tx) => {
      await tx.ordemDeServico.update({
        where: { id: os.id },
        data: {
          descricaoInicial: os.descricaoInicial,
          diagnostico: os.diagnostico,
          status: os.status,
          usuarioId: os.usuarioId,
        },
      });
      await tx.itemOrdemDeServicoServico.deleteMany({
        where: { ordemDeServicoId: os.id },
      });
      if (os.itensServico.length > 0) {
        await tx.itemOrdemDeServicoServico.createMany({
          data: os.itensServico.map((item) => ({
            ordemDeServicoId: os.id as string,
            servicoId: item.servicoId,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            statusExecucao: item.statusExecucao,
            inicioExecucao: item.inicioExecucao,
            fimExecucao: item.fimExecucao,
            horasTrabalhadas: item.horasTrabalhadas,
          })),
        });
      }
      await tx.itemOrdemDeServicoProduto.deleteMany({
        where: { ordemDeServicoId: os.id },
      });
      if (os.itensProduto.length > 0) {
        await tx.itemOrdemDeServicoProduto.createMany({
          data: os.itensProduto.map((item) => ({
            ordemDeServicoId: os.id as string,
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
          })),
        });
      }
      return tx.ordemDeServico.findUnique({
        where: { id: os.id },
        include: INCLUDE_ITENS,
      });
    });
    return this.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.ordemDeServico.delete({
      where: { id },
    });
  }

  async existsByNumero(numero: string): Promise<boolean> {
    const count = await this.prisma.ordemDeServico.count({
      where: { numero },
    });
    return count > 0;
  }

  private toDomain(data: any): OrdemDeServico {
    const itensServico: ItemServicoOS[] = (data.itensServico ?? []).map(
      (i: any) =>
        new ItemServicoOS(
          i.servicoId,
          i.quantidade,
          Number(i.precoUnitario),
          (i.statusExecucao ?? 'PENDENTE') as StatusExecucaoItem,
          i.inicioExecucao ?? null,
          i.fimExecucao ?? null,
          i.horasTrabalhadas ?? null,
        ),
    );
    const itensProduto: ItemProdutoOS[] = (data.itensProduto ?? []).map(
      (i: any) =>
        new ItemProdutoOS(i.produtoId, i.quantidade, Number(i.precoUnitario)),
    );
    return OrdemDeServico.reconstitute({
      id: data.id,
      numero: data.numero,
      clienteId: data.clienteId,
      veiculoId: data.veiculoId,
      usuarioId: data.usuarioId,
      descricaoInicial: data.descricaoInicial,
      diagnostico: data.diagnostico,
      status: data.status as StatusOS,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      itensServico,
      itensProduto,
    });
  }
}
