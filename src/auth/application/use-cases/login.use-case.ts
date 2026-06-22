import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UseCase } from '../../../shared/application/use-case';
import { Role } from '../../domain/role.enum';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error';
import {
  USUARIO_AUTH_GATEWAY,
  UsuarioGateway,
} from '../gateways/usuario.gateway';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface LoginResult {
  accessToken: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    role: Role;
  };
}

export interface LoginInput {
  email: string;
  senha: string;
}

@Injectable()
export class LoginUseCase implements UseCase<LoginInput, LoginResult> {
  constructor(
    @Inject(USUARIO_AUTH_GATEWAY)
    private readonly gateway: UsuarioGateway,
    private readonly jwtService: JwtService,
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const usuario = await this.gateway.findByEmail(input.email);
    if (!usuario || !usuario.ativo) {
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await bcrypt.compare(input.senha, usuario.senhaHash);
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const payload: JwtPayload = {
      sub: usuario.id!,
      email: usuario.email.value,
      role: usuario.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      usuario: {
        id: usuario.id!,
        nome: usuario.nome,
        email: usuario.email.value,
        role: usuario.role,
      },
    };
  }
}
