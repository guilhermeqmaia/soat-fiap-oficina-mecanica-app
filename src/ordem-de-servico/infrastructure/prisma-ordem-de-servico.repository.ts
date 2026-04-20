import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OrdemDeServicoRepository,
  FindAllParams,
  PaginatedResult,
} from '../domain/ordem-de-servico.repository';
import { OrdemDeServico } from '../domain/ordem-de-servico.entity';
import { StatusOS } from '../domain/value-objects/status-os.vo';

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
        diagnosticoAt: os.diagnosticoAt,
        status: os.status,
      },
    });
    return this.toDomain(data);
  }

  async findById(id: string): Promise<OrdemDeServico | null> {
    const data = await this.prisma.ordemDeServico.findUnique({
      where: { id },
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

    const [data, total] = await Promise.all([
      this.prisma.ordemDeServico.findMany({
        where,
        skip,
        take: params.limit ?? 10,
        orderBy: { createdAt: 'desc' },
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
    });
    return data ? this.toDomain(data) : null;
  }

  async update(os: OrdemDeServico): Promise<OrdemDeServico> {
    const data = await this.prisma.ordemDeServico.update({
      where: { id: os.id },
      data: {
        descricaoInicial: os.descricaoInicial,
        diagnostico: os.diagnostico,
        diagnosticoAt: os.diagnosticoAt,
        status: os.status,
        usuarioId: os.usuarioId,
      },
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
    return OrdemDeServico.reconstitute({
      id: data.id,
      numero: data.numero,
      clienteId: data.clienteId,
      veiculoId: data.veiculoId,
      usuarioId: data.usuarioId,
      descricaoInicial: data.descricaoInicial,
      diagnostico: data.diagnostico,
      diagnosticoAt: data.diagnosticoAt ?? null,
      status: data.status as StatusOS,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
