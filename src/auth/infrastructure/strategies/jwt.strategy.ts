import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from '../../domain/authenticated-user';
import { Role } from '../../domain/role.enum';

/** Claims do token emitido pela Lambda de CPF (contrato da RFC-0003). */
export interface JwtPayload {
  sub: string;
  cpf?: string;
  nome?: string;
  role: string;
  iss: string;
}

/**
 * Resource server (US-F3-03): a aplicacao NAO emite tokens — valida assinatura
 * (segredo compartilhado via Secrets Manager), `iss` da Lambda e `exp`, e
 * monta o principal direto das claims, sem consulta ao banco. A revogacao de
 * um usuario vale a partir da expiracao do token (TTL 1h).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
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
      algorithms: ['HS256'],
      issuer: configService.get<string>('JWT_ISSUER') ?? 'oficina-auth-lambda',
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    const role = Object.values(Role).find((value) => value === payload.role);
    if (!payload.sub || !role) {
      throw new UnauthorizedException('Token sem as claims obrigatorias (sub/role)');
    }
    return new AuthenticatedUser(payload.sub, payload.nome ?? '', payload.cpf ?? null, role);
  }
}
