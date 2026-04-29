import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Produto } from '../domain/produto.entity';
import { MovimentacaoEstoque } from '../domain/movimentacao-estoque.entity';
import { EstoqueUnitOfWork } from '../domain/estoque-unit-of-work';
import { TipoMovimentacaoEstoque } from '../domain/value-objects/tipo-movimentacao-estoque.vo';

@Injectable()
export class PrismaEstoqueUnitOfWork implements EstoqueUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async persistirAtualizacaoComMovimentacao(
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
      produto: Produto.reconstitute({
        id: produtoRecord.id,
        nome: produtoRecord.nome,
        descricao: produtoRecord.descricao,
        precoUnitario: Number(produtoRecord.precoUnitario),
        quantidadeEstoque: produtoRecord.quantidadeEstoque,
        quantidadeReservada: produtoRecord.quantidadeReservada,
        estoqueMinimo: produtoRecord.estoqueMinimo,
        ativo: produtoRecord.ativo,
      }),
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
}
