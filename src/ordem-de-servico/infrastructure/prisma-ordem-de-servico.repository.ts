import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OrdemDeServicoRepository,
  FindAllParams,
  PaginatedResult,
  AdicionarItemInput,
} from '../domain/ordem-de-servico.repository';
import { OrdemDeServico } from '../domain/ordem-de-servico.entity';
import { StatusOS } from '../domain/value-objects/status-os.vo';
import { OSNaoEncontradaError } from '../domain/errors/os-nao-encontrada.error';
import { ProdutoDuplicadoNaOSError } from '../domain/errors/produto-duplicado-na-os.error';
import { ProdutoInexistenteNaOSError } from '../domain/errors/produto-inexistente-na-os.error';
import { InvalidStatusTransitionError } from '../domain/errors/invalid-status-transition.error';
import { Produto } from '../../produto/domain/produto.entity';

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
    });
    return this.toDomain(data);
  }

  async findById(id: string): Promise<OrdemDeServico | null> {
    const data = await this.prisma.ordemDeServico.findUnique({
      where: { id },
      include: {
        itensProduto: { include: { produto: { select: { nome: true } } } },
      },
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

  async adicionarItemProduto(input: AdicionarItemInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Lock pessimista no produto para evitar TOCTOU na reserva de estoque
      const produtoRecords = await tx.$queryRaw<
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
      >`SELECT * FROM "produto" WHERE id = ${input.produtoId} FOR UPDATE`;

      const produtoRecord = produtoRecords[0];
      if (!produtoRecord) {
        throw new Error(`Produto com id '${input.produtoId}' nao encontrado`);
      }

      const produto = Produto.reconstitute({
        id: produtoRecord.id,
        nome: produtoRecord.nome,
        descricao: produtoRecord.descricao,
        precoUnitario: Number(produtoRecord.preco_unitario),
        quantidadeEstoque: produtoRecord.quantidade_estoque,
        quantidadeReservada: produtoRecord.quantidade_reservada,
        estoqueMinimo: produtoRecord.estoque_minimo,
        ativo: produtoRecord.ativo,
      });

      const os = await tx.ordemDeServico.findUnique({
        where: { id: input.ordemDeServicoId },
        include: { itensProduto: true },
      });
      if (!os) throw new OSNaoEncontradaError(input.ordemDeServicoId);
      if (os.status !== StatusOS.EM_DIAGNOSTICO) {
        throw new InvalidStatusTransitionError(os.status, StatusOS.EM_DIAGNOSTICO);
      }
      if (os.itensProduto.some((i) => i.produtoId === input.produtoId)) {
        throw new ProdutoDuplicadoNaOSError(produto.nome);
      }

      produto.reserve(input.quantidade); // throws InsufficientStockError

      await tx.produto.update({
        where: { id: produto.id! },
        data: { quantidadeReservada: produto.quantidadeReservada },
      });

      await tx.itemOrdemDeServicoProduto.create({
        data: {
          ordemDeServicoId: input.ordemDeServicoId,
          produtoId: input.produtoId,
          quantidade: input.quantidade,
          valorUnitario: input.valorUnitario,
        },
      });

      await tx.ordemDeServico.update({
        where: { id: input.ordemDeServicoId },
        data: { updatedAt: new Date() },
      });
    });
  }

  async removerItemProduto(
    ordemDeServicoId: string,
    produtoId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const os = await tx.ordemDeServico.findUnique({
        where: { id: ordemDeServicoId },
      });
      if (!os) throw new OSNaoEncontradaError(ordemDeServicoId);
      if (os.status !== StatusOS.EM_DIAGNOSTICO) {
        throw new InvalidStatusTransitionError(os.status, StatusOS.EM_DIAGNOSTICO);
      }

      const item = await tx.itemOrdemDeServicoProduto.findUnique({
        where: {
          ordemDeServicoId_produtoId: { ordemDeServicoId, produtoId },
        },
      });
      if (!item) throw new ProdutoInexistenteNaOSError(produtoId);

      const produtoRecords = await tx.$queryRaw<
        Array<{ quantidade_reservada: number }>
      >`SELECT quantidade_reservada FROM "produto" WHERE id = ${produtoId} FOR UPDATE`;

      const novaReserva = Math.max(
        0,
        (produtoRecords[0]?.quantidade_reservada ?? 0) - item.quantidade,
      );

      await tx.produto.update({
        where: { id: produtoId },
        data: { quantidadeReservada: novaReserva },
      });

      await tx.itemOrdemDeServicoProduto.delete({ where: { id: item.id } });

      await tx.ordemDeServico.update({
        where: { id: ordemDeServicoId },
        data: { updatedAt: new Date() },
      });
    });
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
      status: data.status as StatusOS,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      itensProduto: (data.itensProduto ?? []).map(
        (i: {
          produtoId: string;
          quantidade: number;
          valorUnitario: unknown;
          produto?: { nome: string };
        }) => ({
          produtoId: i.produtoId,
          nomeProduto: i.produto?.nome ?? '',
          quantidade: i.quantidade,
          valorUnitario: Number(i.valorUnitario),
        }),
      ),
    });
  }
}
