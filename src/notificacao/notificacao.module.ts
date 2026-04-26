import { Module } from '@nestjs/common';
import { ClienteModule } from '../cliente/cliente.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificacaoService } from './application/notificacao.service';
import { OrdemDeServicoNotificacaoListener } from './application/listeners/ordem-de-servico.listener';
import { NOTIFICADOR } from './application/ports/notificador.port';
import { NOTIFICACAO_REPOSITORY } from './domain/notificacao.repository';
import { MockEmailNotificador } from './infrastructure/mock-notificador.adapter';
import { NotificacaoController } from './infrastructure/notificacao.controller';
import { PrismaNotificacaoRepository } from './infrastructure/prisma-notificacao.repository';

@Module({
  imports: [PrismaModule, ClienteModule],
  controllers: [NotificacaoController],
  providers: [
    NotificacaoService,
    OrdemDeServicoNotificacaoListener,
    {
      provide: NOTIFICACAO_REPOSITORY,
      useClass: PrismaNotificacaoRepository,
    },
    MockEmailNotificador,
    {
      provide: NOTIFICADOR,
      useFactory: (mockEmail: MockEmailNotificador) => [mockEmail],
      inject: [MockEmailNotificador],
    },
  ],
  exports: [NotificacaoService],
})
export class NotificacaoModule {}
