import { Module } from '@nestjs/common';
import { ClienteModule } from '../cliente/cliente.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CLIENTE_REPOSITORY } from '../cliente/domain/cliente.repository';
import { OrdemDeServicoNotificacaoListener } from './application/listeners/ordem-de-servico.listener';
import { NOTIFICADOR } from './application/ports/notificador.port';
import { NOTIFICACAO_GATEWAY } from './application/gateways/notificacao.gateway';
import { CLIENTE_CONSULTA_GATEWAY } from './application/gateways/cliente-consulta.gateway';
import { EnviarNotificacaoUseCase } from './application/use-cases/enviar-notificacao.use-case';
import { ListarNotificacoesUseCase } from './application/use-cases/listar-notificacoes.use-case';
import { ListarNotificacoesPorCpfCnpjUseCase } from './application/use-cases/listar-notificacoes-por-cpf-cnpj.use-case';
import { NOTIFICACAO_REPOSITORY } from './domain/notificacao.repository';
import { ClienteNotificacaoController } from './infrastructure/cliente-notificacao.controller';
import { NotificacaoController } from './infrastructure/notificacao.controller';
import { MockEmailNotificador } from './infrastructure/mock-notificador.adapter';
import { PrismaNotificacaoRepository } from './infrastructure/prisma-notificacao.repository';

@Module({
  imports: [PrismaModule, ClienteModule],
  controllers: [NotificacaoController, ClienteNotificacaoController],
  providers: [
    // Infrastructure adapter
    PrismaNotificacaoRepository,
    { provide: NOTIFICACAO_REPOSITORY, useExisting: PrismaNotificacaoRepository },
    { provide: NOTIFICACAO_GATEWAY, useExisting: PrismaNotificacaoRepository },

    // Cross-context gateway — binds ClienteConsultaGateway to the exported ClienteRepository
    { provide: CLIENTE_CONSULTA_GATEWAY, useExisting: CLIENTE_REPOSITORY },

    // Notificadores
    MockEmailNotificador,
    {
      provide: NOTIFICADOR,
      useFactory: (mockEmail: MockEmailNotificador) => [mockEmail],
      inject: [MockEmailNotificador],
    },

    // Use cases
    EnviarNotificacaoUseCase,
    ListarNotificacoesUseCase,
    ListarNotificacoesPorCpfCnpjUseCase,

    // Event listener
    OrdemDeServicoNotificacaoListener,
  ],
  exports: [EnviarNotificacaoUseCase],
})
export class NotificacaoModule {}
