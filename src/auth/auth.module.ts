import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './infrastructure/auth.controller';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { PrismaUsuarioRepository } from './infrastructure/prisma-usuario.repository';
import { USUARIO_REPOSITORY } from './domain/usuario.repository';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from './infrastructure/guards/roles.guard';

/**
 * Resource server (US-F3-03): sem emissao de token, sem JwtModule de
 * assinatura — apenas a strategy de VALIDACAO (segredo + iss + exp) e os
 * guards globais. O repositorio de Usuario permanece exportado para o CRUD
 * de usuarios (modulo usuario) e demais consumidores de dominio.
 */
@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    PrismaUsuarioRepository,
    { provide: USUARIO_REPOSITORY, useExisting: PrismaUsuarioRepository },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [USUARIO_REPOSITORY],
})
export class AuthModule {}
