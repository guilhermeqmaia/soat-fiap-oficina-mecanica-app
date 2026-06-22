import { Usuario } from '../../../auth/domain/usuario.entity';
import { UsuarioOutput } from '../../application/usuario-output';
import { PaginatedResult } from '../../application/gateways/usuario.gateway';

/**
 * Presenter do Usuario: traduz a ENTIDADE de dominio para o shape plano
 * de resposta HTTP. Concentra o mapeamento que antes vivia inline no service.
 */
export class UsuarioPresenter {
  static toOutput(usuario: Usuario): UsuarioOutput {
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email.value,
      role: usuario.role,
      ativo: usuario.ativo,
    };
  }

  static toPaginatedResponse(
    result: PaginatedResult<Usuario>,
  ): PaginatedResult<UsuarioOutput> {
    return {
      data: result.data.map((u) => UsuarioPresenter.toOutput(u)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
