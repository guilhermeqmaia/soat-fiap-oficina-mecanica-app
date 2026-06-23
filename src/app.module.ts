import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    EventEmitterModule.forRoot(),
    // Rate limiting global (anti brute-force/DoS). Desabilitado sob jest
    // (JEST_WORKER_ID) para nao introduzir flakiness por 429 nos testes e2e.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 100 }],
      skipIf: () =>
        process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID,
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
export class AppModule {}
