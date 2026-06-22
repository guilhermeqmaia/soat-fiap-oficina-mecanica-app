import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import {
  USUARIO_GATEWAY,
  UsuarioGateway,
  FindAllParams,
  PaginatedResult,
} from '../gateways/usuario.gateway';
import { UsuarioOutput } from '../usuario-output';

@Injectable()
export class ListarUsuariosUseCase
  implements UseCase<FindAllParams, PaginatedResult<UsuarioOutput>>
{
  constructor(
    @Inject(USUARIO_GATEWAY)
    private readonly gateway: UsuarioGateway,
  ) {}

  async execute(input: FindAllParams): Promise<PaginatedResult<UsuarioOutput>> {
    const result = await this.gateway.findAll(input);
    return {
      data: result.data.map((u) => ({
        id: u.id,
        nome: u.nome,
        email: u.email.value,
        role: u.role,
        ativo: u.ativo,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
