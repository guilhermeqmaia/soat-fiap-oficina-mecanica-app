import { Module } from '@nestjs/common';
import { AuthController } from './infrastructure/auth.controller';
import { PrismaUsuarioRepository } from './infrastructure/prisma-usuario.repository';
import { USUARIO_REPOSITORY } from './domain/usuario.repository';

/**
 * Parte de autenticacao que e DESTE servico: a identidade corrente
 * (`GET /auth/me`) e o repositorio de Usuario (staff). A validacao do JWT da
 * Lambda, os guards globais e os decorators vem do kit —
 * `AuthModule.forRootAsync` de `@guilhermeqmaia/oficina-kit/auth` no `AppModule`.
 */
@Module({
  controllers: [AuthController],
  providers: [PrismaUsuarioRepository, { provide: USUARIO_REPOSITORY, useExisting: PrismaUsuarioRepository }],
  exports: [USUARIO_REPOSITORY],
})
export class AuthModule {}
