import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../../application/use-cases/login.use-case';
import { ValidarUsuarioPorIdUseCase } from '../../application/use-cases/validar-usuario-por-id.use-case';
import { Usuario } from '../../domain/usuario.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly validarUsuarioPorId: ValidarUsuarioPorIdUseCase,
    configService: ConfigService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_SECRET is required. Set it in your environment before starting the app.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<Usuario> {
    const usuario = await this.validarUsuarioPorId.execute({ id: payload.sub });
    if (!usuario) {
      throw new UnauthorizedException('Usuario nao encontrado ou inativo');
    }
    return usuario;
  }
}
