import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ServicoController } from './infrastructure/servico.controller';
import { PrismaServicoRepository } from './infrastructure/prisma-servico.repository';
import { SERVICO_REPOSITORY } from './domain/servico.repository';
import { SERVICO_GATEWAY } from './application/gateways/servico.gateway';
import { CriarServicoUseCase } from './application/use-cases/criar-servico.use-case';
import { ListarServicosUseCase } from './application/use-cases/listar-servicos.use-case';
import { BuscarServicoPorIdUseCase } from './application/use-cases/buscar-servico-por-id.use-case';
import { AtualizarServicoUseCase } from './application/use-cases/atualizar-servico.use-case';
import { DeletarServicoUseCase } from './application/use-cases/deletar-servico.use-case';

const USE_CASES = [
  CriarServicoUseCase,
  ListarServicosUseCase,
  BuscarServicoPorIdUseCase,
  AtualizarServicoUseCase,
  DeletarServicoUseCase,
];

@Module({
  imports: [PrismaModule],
  controllers: [ServicoController],
  providers: [
    ...USE_CASES,
    // Persistencia: o adapter Prisma satisfaz a porta de repositorio e o gateway.
    PrismaServicoRepository,
    {
      provide: SERVICO_REPOSITORY,
      useExisting: PrismaServicoRepository,
    },
    {
      provide: SERVICO_GATEWAY,
      useExisting: PrismaServicoRepository,
    },
  ],
  exports: [SERVICO_REPOSITORY, SERVICO_GATEWAY],
})
export class ServicoModule {}
