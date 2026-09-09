import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import {
  THROTTLER_LIMIT,
  THROTTLER_TTL_MS,
  shouldSkipThrottling,
} from './config/throttler.config';
import { HealthModule } from './health/health.module';
import { SharedModule } from './shared/shared.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ServicoModule } from './servico/servico.module';
import { ProdutoModule } from './produto/produto.module';
import { ClienteModule } from './cliente/cliente.module';
import { VeiculoModule } from './veiculo/veiculo.module';
import { OrdemDeServicoModule } from './ordem-de-servico/ordem-de-servico.module';
import { UsuarioModule } from './usuario/usuario.module';
import { NotificacaoModule } from './notificacao/notificacao.module';
import { LoggerModule } from './shared/infrastructure/logging/logger.module';
import { CorrelationIdMiddleware } from './shared/infrastructure/correlation-id.middleware';
import { ObservabilidadeModule } from './observabilidade/observabilidade.module';

@Module({
  imports: [
    ObservabilidadeModule,
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule,
    EventEmitterModule.forRoot(),
    // Rate limiting global (anti brute-force/DoS). Desabilitado sob jest
    // (JEST_WORKER_ID) para nao introduzir flakiness por 429 nos testes e2e, e
    // sob THROTTLER_DISABLED=true para os testes de carga (US-F2-11) medirem a
    // app, nao o throttler. Ver src/config/throttler.config.ts.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: THROTTLER_TTL_MS, limit: THROTTLER_LIMIT }],
      skipIf: () => shouldSkipThrottling(),
    }),
    SharedModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    UsuarioModule,
    ServicoModule,
    ProdutoModule,
    ClienteModule,
    VeiculoModule,
    OrdemDeServicoModule,
    NotificacaoModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
