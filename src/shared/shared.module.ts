import { Global, Module } from '@nestjs/common';
import { PASSWORD_HASHER } from './application/password-hasher';
import { BcryptPasswordHasher } from './infrastructure/bcrypt-password-hasher';

/**
 * Portas transversais que permanecem NESTE servico. O que era comum a todos
 * os servicos (DomainExceptionFilter, publisher de eventos, logging, metricas)
 * migrou para `@guilhermeqmaia/oficina-kit` (ADR-0010).
 *
 * - `PASSWORD_HASHER`: hashing de senhas (bcrypt) do CRUD de usuarios.
 */
@Global()
@Module({
  providers: [BcryptPasswordHasher, { provide: PASSWORD_HASHER, useExisting: BcryptPasswordHasher }],
  exports: [PASSWORD_HASHER],
})
export class SharedModule {}
