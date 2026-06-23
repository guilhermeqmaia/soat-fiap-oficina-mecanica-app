import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClienteModule } from '../cliente/cliente.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CLIENTE_REPOSITORY } from '../cliente/domain/cliente.repository';
import { OrdemDeServicoNotificacaoListener } from './application/listeners/ordem-de-servico.listener';
import { PUBLIC_BASE_URL } from './application/ports/public-base-url';
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

    // URL publica resolvida na borda (mantem @nestjs/config fora da aplicacao)
    {
      provide: PUBLIC_BASE_URL,
      useFactory: (config: ConfigService) =>
        config
          .get<string>('PUBLIC_BASE_URL', 'http://localhost:3000')
          .replace(/\/+$/, ''),
      inject: [ConfigService],
    },

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
