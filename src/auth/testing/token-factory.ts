import * as jwt from 'jsonwebtoken';
import { Role } from '../domain/role.enum';

/**
 * Fabrica de tokens para TESTES e desenvolvimento local (resource server —
 * US-F3-03): em producao o unico emissor e a Lambda de CPF; aqui reproduzimos
 * o contrato dela (claims + iss) para exercitar a aplicacao sem o gateway.
 */

export interface TokenClaims {
  sub: string;
  nome?: string;
  cpf?: string;
  role: Role | string;
}

export function mintToken(
  claims: TokenClaims,
  options: { secret?: string; issuer?: string; expiresIn?: number } = {},
): string {
  const secret = options.secret ?? process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET ausente para emitir token de teste');
  }
  return jwt.sign(
    { cpf: claims.cpf, nome: claims.nome ?? 'Teste', role: claims.role },
    secret,
    {
      algorithm: 'HS256',
      subject: claims.sub,
      issuer: options.issuer ?? process.env.JWT_ISSUER ?? 'oficina-auth-lambda',
      expiresIn: options.expiresIn ?? 3600,
    },
  );
}
