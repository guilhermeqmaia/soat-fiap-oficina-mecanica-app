import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Usuario } from '../../domain/usuario.entity';
import {
  USUARIO_AUTH_GATEWAY,
  UsuarioGateway,
} from '../gateways/usuario.gateway';

export interface ValidarUsuarioPorIdInput {
  id: string;
}

@Injectable()
export class ValidarUsuarioPorIdUseCase
  implements UseCase<ValidarUsuarioPorIdInput, Usuario | null>
{
  constructor(
    @Inject(USUARIO_AUTH_GATEWAY)
    private readonly gateway: UsuarioGateway,
  ) {}

  async execute(input: ValidarUsuarioPorIdInput): Promise<Usuario | null> {
    const usuario = await this.gateway.findById(input.id);
    if (!usuario || !usuario.ativo) {
      return null;
    }
    return usuario;
  }
}
