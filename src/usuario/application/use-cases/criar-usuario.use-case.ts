import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../shared/application/use-case';
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from '../../../shared/application/password-hasher';
import { Usuario } from '../../../auth/domain/usuario.entity';
import { Role } from '../../../auth/domain/role.enum';
import { InvalidRoleError } from '../../domain/errors/invalid-role.error';
import { EmailAlreadyExistsError } from '../../domain/errors/email-already-exists.error';
import { USUARIO_GATEWAY, UsuarioGateway } from '../gateways/usuario.gateway';
import { UsuarioOutput } from '../usuario-output';

export interface CriarUsuarioInput {
  nome: string;
  email: string;
  senha: string;
  role: string;
}

@Injectable()
export class CriarUsuarioUseCase
  implements UseCase<CriarUsuarioInput, UsuarioOutput>
{
  constructor(
    @Inject(USUARIO_GATEWAY)
    private readonly gateway: UsuarioGateway,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: CriarUsuarioInput): Promise<UsuarioOutput> {
    if (!Object.values(Role).includes(input.role as Role)) {
      throw new InvalidRoleError(input.role);
    }

    const usuarioExistente = await this.gateway.findByEmail(input.email);
    if (usuarioExistente) {
      throw new EmailAlreadyExistsError(input.email);
    }

    const senhaHash = await this.passwordHasher.hash(input.senha);

    const usuario = Usuario.create({
      nome: input.nome,
      email: input.email,
      senhaHash,
      role: input.role as Role,
    });

    const created = await this.gateway.create(usuario);
    return {
      id: created.id,
      nome: created.nome,
      email: created.email.value,
      role: created.role,
      ativo: created.ativo,
    };
  }
}
