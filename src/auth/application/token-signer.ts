import { Role } from '../domain/role.enum';

/** Claims do token de acesso emitido apos a autenticacao. */
export interface TokenPayload {
  sub: string;
  email: string;
  role: Role;
}

/**
 * Porta de saida para emissao de tokens de acesso.
 *
 * O `LoginUseCase` depende apenas desta interface; o adapter concreto
 * (`JwtTokenSigner`) encapsula o `JwtService` do NestJS, mantendo o framework
 * de JWT fora do anel de aplicacao.
 */
export interface TokenSigner {
  sign(payload: TokenPayload): Promise<string>;
}

export const TOKEN_SIGNER = Symbol('TokenSigner');
