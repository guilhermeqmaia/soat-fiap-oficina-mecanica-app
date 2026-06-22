import { Produto } from '../../domain/produto.entity';
import { PaginatedResult } from '../../application/gateways/produto.gateway';

/**
 * Presenter do Produto: traduz a ENTIDADE de dominio para o shape plano de
 * resposta HTTP. Concentra a formatacao que antes vivia inline (`toResponse`)
 * no controller, mantendo a camada de interface livre de logica de mapeamento.
 */
export class ProdutoPresenter {
  static toResponse(produto: Produto) {
    return {
      id: produto.id,
      nome: produto.nome,
      descricao: produto.descricao,
      precoUnitario: produto.precoUnitario.value,
      quantidadeEstoque: produto.quantidadeEstoque,
      quantidadeReservada: produto.quantidadeReservada,
      quantidadeDisponivel: produto.quantidadeDisponivel,
      estoqueMinimo: produto.estoqueMinimo,
      ativo: produto.ativo,
      alertaEstoqueBaixo: produto.isLowStock(),
    };
  }

  static toPaginatedResponse(result: PaginatedResult<Produto>) {
    return {
      data: result.data.map((p) => ProdutoPresenter.toResponse(p)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  static toResponseList(produtos: Produto[]) {
    return produtos.map((p) => ProdutoPresenter.toResponse(p));
  }
}
