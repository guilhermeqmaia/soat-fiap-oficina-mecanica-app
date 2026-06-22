import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaUsuarioRepository } from './infrastructure/prisma-usuario.repository';
import { USUARIO_REPOSITORY } from './domain/usuario.repository';
import { USUARIO_GATEWAY } from './application/gateways/usuario.gateway';
import { UsuarioController } from './infrastructure/usuario.controller';
import { CriarUsuarioUseCase } from './application/use-cases/criar-usuario.use-case';
import { BuscarUsuarioPorIdUseCase } from './application/use-cases/buscar-usuario-por-id.use-case';
import { ListarUsuariosUseCase } from './application/use-cases/listar-usuarios.use-case';
import { AtualizarUsuarioUseCase } from './application/use-cases/atualizar-usuario.use-case';
import { DeletarUsuarioUseCase } from './application/use-cases/deletar-usuario.use-case';

const USE_CASES = [
  CriarUsuarioUseCase,
  BuscarUsuarioPorIdUseCase,
  ListarUsuariosUseCase,
  AtualizarUsuarioUseCase,
  DeletarUsuarioUseCase,
];

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UsuarioController],
  providers: [
    ...USE_CASES,
    // Persistencia: o adapter Prisma satisfaz a porta de repositorio e o gateway.
    PrismaUsuarioRepository,
    {
      provide: USUARIO_REPOSITORY,
      useExisting: PrismaUsuarioRepository,
    },
    {
      provide: USUARIO_GATEWAY,
      useExisting: PrismaUsuarioRepository,
    },
  ],
  exports: [USUARIO_REPOSITORY, USUARIO_GATEWAY],
})
export class UsuarioModule {}
