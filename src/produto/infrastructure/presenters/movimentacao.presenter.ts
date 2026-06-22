import { MovimentacaoEstoque } from '../../domain/movimentacao-estoque.entity';
import { PaginatedResult } from '../../application/gateways/movimentacao-estoque.gateway';
import { MovimentacaoEstoqueResponseDto } from '../dto/movimentacao-response.dto';

/**
 * Presenter da MovimentacaoEstoque: traduz a entidade de dominio para o DTO
 * de resposta HTTP.
 */
export class MovimentacaoPresenter {
  static toResponse(m: MovimentacaoEstoque): MovimentacaoEstoqueResponseDto {
    return {
      id: m.id!,
      produtoId: m.produtoId,
      tipo: m.tipo,
      quantidade: m.quantidade,
      estoqueResultante: m.estoqueResultante,
      ordemDeServicoId: m.ordemDeServicoId,
      motivo: m.motivo,
      usuarioId: m.usuarioId,
      createdAt: m.createdAt!,
    };
  }

  static toPaginatedResponse(result: PaginatedResult<MovimentacaoEstoque>) {
    return {
      data: result.data.map((m) => MovimentacaoPresenter.toResponse(m)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
