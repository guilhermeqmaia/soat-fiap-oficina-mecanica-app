import { Produto } from '../../domain/produto.entity';
import { MovimentacaoEstoque } from '../../domain/movimentacao-estoque.entity';
import { TipoMovimentacaoEstoque } from '../../domain/value-objects/tipo-movimentacao-estoque.vo';
import { EstoqueUnitOfWork } from '../../domain/estoque-unit-of-work';
import { MovimentacaoContext } from '../../domain/movimentacao-context';

/**
 * Helper transacional compartilhado pelos use cases de estoque.
 *
 * Cria o registro de MovimentacaoEstoque e persiste produto + movimentacao
 * atomicamente via EstoqueUnitOfWork, garantindo que o estado do estoque
 * e o historico de auditoria estejam sempre sincronizados.
 */
export async function persistirComMovimentacao(
  uow: EstoqueUnitOfWork,
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

  const result = await uow.persistirAtualizacaoComMovimentacao(
    produto,
    movimentacao,
  );

  return result.produto;
}
