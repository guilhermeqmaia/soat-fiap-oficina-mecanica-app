import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { UsuarioNotFoundError } from '../../domain/errors/usuario-not-found.error';
import { USUARIO_GATEWAY, UsuarioGateway } from '../gateways/usuario.gateway';
import { UsuarioOutput } from '../usuario-output';

export interface BuscarUsuarioPorIdInput {
  id: string;
}

@Injectable()
export class BuscarUsuarioPorIdUseCase
  implements UseCase<BuscarUsuarioPorIdInput, UsuarioOutput>
{
  constructor(
    @Inject(USUARIO_GATEWAY)
    private readonly gateway: UsuarioGateway,
  ) {}

  async execute(input: BuscarUsuarioPorIdInput): Promise<UsuarioOutput> {
    const usuario = await this.gateway.findById(input.id);
    if (!usuario) {
      throw new UsuarioNotFoundError(input.id);
    }
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email.value,
      role: usuario.role,
      ativo: usuario.ativo,
    };
  }
}
