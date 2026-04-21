import { Module } from '@nestjs/common';
import { ServicoService } from './application/servico.service';
import { ServicoController } from './infrastructure/servico.controller';
import { PrismaServicoRepository } from './infrastructure/prisma-servico.repository';
import { SERVICO_REPOSITORY } from './domain/servico.repository';

@Module({
  controllers: [ServicoController],
  providers: [
    ServicoService,
    {
      provide: SERVICO_REPOSITORY,
      useClass: PrismaServicoRepository,
    },
  ],
  exports: [ServicoService, SERVICO_REPOSITORY],
})
export class ServicoModule {}
