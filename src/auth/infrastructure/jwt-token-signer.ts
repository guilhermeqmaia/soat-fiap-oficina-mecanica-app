import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenPayload, TokenSigner } from '../application/token-signer';

/**
 * Adapter de infraestrutura que implementa `TokenSigner` sobre o `JwtService`
 * do NestJS. Unico ponto da camada externa que conhece o framework de JWT.
 */
@Injectable()
export class JwtTokenSigner implements TokenSigner {
  constructor(private readonly jwtService: JwtService) {}

  sign(payload: TokenPayload): Promise<string> {
    return this.jwtService.signAsync({ ...payload });
  }
}
