import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import { Usuario } from '../../../auth/domain/usuario.entity';
import { Role } from '../../../auth/domain/role.enum';
import { UsuarioNotFoundError } from '../../domain/errors/usuario-not-found.error';
import { EmailAlreadyExistsError } from '../../domain/errors/email-already-exists.error';
import { InvalidRoleError } from '../../domain/errors/invalid-role.error';
import { USUARIO_GATEWAY, UsuarioGateway } from '../gateways/usuario.gateway';
import { UsuarioOutput } from '../usuario-output';

export interface AtualizarUsuarioInput {
  id: string;
  nome?: string;
  email?: string;
  role?: string;
  ativo?: boolean;
}

@Injectable()
export class AtualizarUsuarioUseCase
  implements UseCase<AtualizarUsuarioInput, UsuarioOutput>
{
  constructor(
    @Inject(USUARIO_GATEWAY)
    private readonly gateway: UsuarioGateway,
  ) {}

  async execute(input: AtualizarUsuarioInput): Promise<UsuarioOutput> {
    const usuario = await this.gateway.findById(input.id);
    if (!usuario) {
      throw new UsuarioNotFoundError(input.id);
    }

    if (input.role && !Object.values(Role).includes(input.role as Role)) {
      throw new InvalidRoleError(input.role);
    }

    if (input.email && input.email !== usuario.email.value) {
      const usuarioComEmail = await this.gateway.findByEmail(input.email);
      if (usuarioComEmail) {
        throw new EmailAlreadyExistsError(input.email);
      }
    }

    const usuarioAtualizado = Usuario.reconstitute({
      id: usuario.id,
      nome: input.nome || usuario.nome,
      email: input.email || usuario.email.value,
      senhaHash: usuario.senhaHash,
      role: (input.role as Role) || usuario.role,
      ativo: input.ativo !== undefined ? input.ativo : usuario.ativo,
    });

    const updated = await this.gateway.update(usuarioAtualizado);
    return {
      id: updated.id,
      nome: updated.nome,
      email: updated.email.value,
      role: updated.role,
      ativo: updated.ativo,
    };
  }
}
