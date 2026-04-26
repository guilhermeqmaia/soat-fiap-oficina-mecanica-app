import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
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
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsuarioModule,
    ServicoModule,
    ProdutoModule,
    ClienteModule,
    VeiculoModule,
    OrdemDeServicoModule,
    NotificacaoModule,
  ],
})
export class AppModule {}
