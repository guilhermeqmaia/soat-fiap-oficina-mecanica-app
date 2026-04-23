import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClienteModule } from '../cliente/cliente.module';
import { VeiculoModule } from '../veiculo/veiculo.module';
import { ServicoModule } from '../servico/servico.module';
import { OrdemDeServicoService } from './application/ordem-de-servico.service';
import { OrdemDeServicoController } from './infrastructure/ordem-de-servico.controller';
import { ClienteOrdemDeServicoController } from './infrastructure/cliente-ordem-de-servico.controller';
import { PrismaOrdemDeServicoRepository } from './infrastructure/prisma-ordem-de-servico.repository';
import { ORDEM_DE_SERVICO_REPOSITORY } from './domain/ordem-de-servico.repository';

@Module({
  imports: [PrismaModule, ClienteModule, VeiculoModule, ServicoModule],
  controllers: [OrdemDeServicoController, ClienteOrdemDeServicoController],
  providers: [
    OrdemDeServicoService,
    {
      provide: ORDEM_DE_SERVICO_REPOSITORY,
      useClass: PrismaOrdemDeServicoRepository,
    },
  ],
  exports: [OrdemDeServicoService, ORDEM_DE_SERVICO_REPOSITORY],
})
export class OrdemDeServicoModule {}
