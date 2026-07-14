import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClienteModule } from '../cliente/cliente.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CLIENTE_REPOSITORY } from '../cliente/domain/cliente.repository';
import { OrdemDeServicoNotificacaoListener } from './application/listeners/ordem-de-servico.listener';
import { PUBLIC_BASE_URL } from './application/ports/public-base-url';
import { APPROVAL_LINK_TOKEN } from './application/ports/approval-link-token';
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
import { SmtpEmailNotificador } from './infrastructure/smtp-email-notificador.adapter';
import { WebhookNotificador } from './infrastructure/webhook-notificador.adapter';

const logger = new Logger('NotificacaoModule');

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
    {
      provide: APPROVAL_LINK_TOKEN,
      useFactory: (config: ConfigService) =>
        config.get<string>('WEBHOOK_APPROVAL_TOKEN', ''),
      inject: [ConfigService],
    },
    // Notificadores
    MockEmailNotificador,
    SmtpEmailNotificador,
    WebhookNotificador,
    {
      provide: NOTIFICADOR,
      useFactory: (
        config: ConfigService,
        mockEmail: MockEmailNotificador,
        smtpEmail: SmtpEmailNotificador,
        webhook: WebhookNotificador,
      ) => {
        // Em teste (jest) nunca usa provider externo: evita chamadas de rede
        // (SMTP/Ethereal/webhook) e testes flaky. Mesma logica do throttler.
        const isTest =
          config.get<string>('NODE_ENV') === 'test' ||
          !!process.env.JEST_WORKER_ID;
        if (isTest) {
          return [mockEmail];
        }

        const provider = (
          config.get<string>('NOTIFICATION_PROVIDER') ??
          (config.get<string>('NODE_ENV') === 'production' ? 'webhook' : 'mock')
        ).toLowerCase();

        if (provider === 'webhook') {
          return [webhook];
        }
        // `email`/`smtp`: envio real via SMTP (nodemailer). Sem SMTP_HOST cai
        // numa conta de teste Ethereal com link de preview (ver o adapter).
        if (provider === 'email' || provider === 'smtp') {
          return [smtpEmail];
        }
        if (provider !== 'mock') {
          logger.warn(
            `NOTIFICATION_PROVIDER=${provider} invalido; usando provider mock`,
          );
        }
        return [mockEmail];
      },
      inject: [
        ConfigService,
        MockEmailNotificador,
        SmtpEmailNotificador,
        WebhookNotificador,
      ],
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
