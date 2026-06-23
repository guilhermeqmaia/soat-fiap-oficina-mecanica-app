import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './infrastructure/auth.controller';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { PrismaUsuarioRepository } from './infrastructure/prisma-usuario.repository';
import { USUARIO_REPOSITORY } from './domain/usuario.repository';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from './infrastructure/guards/roles.guard';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { ValidarUsuarioPorIdUseCase } from './application/use-cases/validar-usuario-por-id.use-case';
import { USUARIO_AUTH_GATEWAY } from './application/gateways/usuario.gateway';
import { TOKEN_SIGNER } from './application/token-signer';
import { JwtTokenSigner } from './infrastructure/jwt-token-signer';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        /* istanbul ignore next */
        if (!secret) {
          throw new Error(
            'JWT_SECRET is required. Set it in your environment before starting the app.',
          );
        }
        return {
          secret,
          signOptions: {
            expiresIn: /* istanbul ignore next */ (configService.get<string>('JWT_EXPIRES_IN') ?? '1h') as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    ValidarUsuarioPorIdUseCase,
    JwtStrategy,
    JwtTokenSigner,
    { provide: TOKEN_SIGNER, useExisting: JwtTokenSigner },
    PrismaUsuarioRepository,
    { provide: USUARIO_REPOSITORY, useExisting: PrismaUsuarioRepository },
    { provide: USUARIO_AUTH_GATEWAY, useExisting: PrismaUsuarioRepository },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [USUARIO_REPOSITORY],
})
export class AuthModule {}
