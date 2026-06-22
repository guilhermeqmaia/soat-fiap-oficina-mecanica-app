import { Servico } from '../../domain/servico.entity';
import { PaginatedResult } from '../../application/gateways/servico.gateway';

/**
 * Presenter do Servico: traduz a ENTIDADE de dominio para o shape plano
 * de resposta HTTP. Concentra a formatacao que antes vivia inline (`toResponse`)
 * no controller, mantendo a camada de interface livre de logica de mapeamento.
 */
export class ServicoPresenter {
  static toResponse(servico: Servico) {
    return {
      id: servico.id,
      nome: servico.nome,
      descricao: servico.descricao,
      precoBase: servico.precoBase.value,
      tempoEstimadoHoras: servico.tempoEstimadoHoras,
      ativo: servico.ativo,
    };
  }

  static toPaginatedResponse(result: PaginatedResult<Servico>) {
    return {
      data: result.data.map((s) => ServicoPresenter.toResponse(s)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
