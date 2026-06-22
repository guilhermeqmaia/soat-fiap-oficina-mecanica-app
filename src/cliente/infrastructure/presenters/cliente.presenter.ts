import { Cliente } from '../../domain/cliente.entity';
import { PaginatedResult } from '../../application/gateways/cliente.gateway';

/**
 * Presenter do Cliente: traduz a ENTIDADE de dominio para o shape plano
 * de resposta HTTP. Concentra a formatacao que antes vivia inline (`toResponse`)
 * no controller, mantendo a camada de interface livre de logica de mapeamento.
 */
export class ClientePresenter {
  static toResponse(cliente: Cliente) {
    return {
      id: cliente.id,
      nome: cliente.nome,
      cpfCnpj: cliente.cpfCnpj.value,
      telefone: cliente.telefone,
      email: cliente.email,
    };
  }

  static toPaginatedResponse(result: PaginatedResult<Cliente>) {
    return {
      data: result.data.map((c) => ClientePresenter.toResponse(c)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
