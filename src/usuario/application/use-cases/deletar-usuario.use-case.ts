import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '@guilhermeqmaia/oficina-kit/core';
import { UsuarioNotFoundError } from '../../domain/errors/usuario-not-found.error';
import { USUARIO_GATEWAY, UsuarioGateway } from '../gateways/usuario.gateway';

export interface DeletarUsuarioInput {
  id: string;
}

@Injectable()
export class DeletarUsuarioUseCase
  implements UseCase<DeletarUsuarioInput, void>
{
  constructor(
    @Inject(USUARIO_GATEWAY)
    private readonly gateway: UsuarioGateway,
  ) {}

  async execute(input: DeletarUsuarioInput): Promise<void> {
    const usuario = await this.gateway.findById(input.id);
    if (!usuario) {
      throw new UsuarioNotFoundError(input.id);
    }
    await this.gateway.delete(input.id);
  }
}
