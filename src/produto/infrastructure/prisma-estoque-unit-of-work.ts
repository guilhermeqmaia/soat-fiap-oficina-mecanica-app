import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Produto } from '../domain/produto.entity';
import { MovimentacaoEstoque } from '../domain/movimentacao-estoque.entity';
import { ProdutoNotFoundError } from '../domain/errors/produto-not-found.error';
import {
  AplicarMovimentacaoEstoqueParams,
  EstoqueUnitOfWork,
} from '../domain/estoque-unit-of-work';

@Injectable()
export class PrismaEstoqueUnitOfWork implements EstoqueUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async mutarComMovimentacao({
    produtoId,
    tipo,
    quantidade,
    ctx,
    aplicar,
  }: AplicarMovimentacaoEstoqueParams): Promise<Produto> {
    return this.prisma.$transaction(async (tx) => {
      // Trava pessimista na linha do produto: reservas/baixas concorrentes do
      // mesmo produto sao serializadas, evitando overselling (lost update).
      const travado = await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT id FROM produto WHERE id = ${produtoId} FOR UPDATE`,
      );
      if (travado.length === 0) {
        throw new ProdutoNotFoundError(produtoId);
      }

      const record = await tx.produto.findUniqueOrThrow({
        where: { id: produtoId },
      });
      const produto = Produto.reconstitute({
        id: record.id,
        nome: record.nome,
        descricao: record.descricao,
        precoUnitario: Number(record.precoUnitario),
        quantidadeEstoque: record.quantidadeEstoque,
        quantidadeReservada: record.quantidadeReservada,
        estoqueMinimo: record.estoqueMinimo,
        ativo: record.ativo,
      });

      // Aplica a operacao de dominio ja com a linha travada. Invariantes (ex.:
      // estoque insuficiente) sao checadas contra o estado atual e, se falharem,
      // abortam a transacao (rollback) sem persistir nada.
      aplicar(produto);

      await tx.produto.update({
        where: { id: produtoId },
        data: {
          quantidadeEstoque: produto.quantidadeEstoque,
          quantidadeReservada: produto.quantidadeReservada,
        },
      });

      const movimentacao = MovimentacaoEstoque.create({
        produtoId,
        tipo,
        quantidade,
        estoqueResultante: produto.quantidadeEstoque,
        ordemDeServicoId: ctx.ordemDeServicoId,
        motivo: ctx.motivo,
        usuarioId: ctx.usuarioId,
      });
      await tx.movimentacaoEstoque.create({
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

      return produto;
    });
  }
}
