import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClienteModule } from '../cliente/cliente.module';
import { CLIENTE_REPOSITORY } from '../cliente/domain/cliente.repository';
import { VeiculoController } from './infrastructure/veiculo.controller';
import { ClienteVeiculoController } from './infrastructure/cliente-veiculo.controller';
import { PrismaVeiculoRepository } from './infrastructure/prisma-veiculo.repository';
import { VEICULO_REPOSITORY } from './domain/veiculo.repository';
import { VEICULO_GATEWAY } from './application/gateways/veiculo.gateway';
import { CLIENTE_CONSULTA_GATEWAY } from './application/gateways/cliente-consulta.gateway';
import { CriarVeiculoUseCase } from './application/use-cases/criar-veiculo.use-case';
import { ListarVeiculosUseCase } from './application/use-cases/listar-veiculos.use-case';
import { BuscarVeiculoPorIdUseCase } from './application/use-cases/buscar-veiculo-por-id.use-case';
import { ListarVeiculosPorClienteUseCase } from './application/use-cases/listar-veiculos-por-cliente.use-case';
import { AtualizarVeiculoUseCase } from './application/use-cases/atualizar-veiculo.use-case';
import { DeletarVeiculoUseCase } from './application/use-cases/deletar-veiculo.use-case';

const USE_CASES = [
  CriarVeiculoUseCase,
  ListarVeiculosUseCase,
  BuscarVeiculoPorIdUseCase,
  ListarVeiculosPorClienteUseCase,
  AtualizarVeiculoUseCase,
  DeletarVeiculoUseCase,
];

@Module({
  imports: [PrismaModule, ClienteModule],
  controllers: [VeiculoController, ClienteVeiculoController],
  providers: [
    ...USE_CASES,
    // Persistencia: o adapter Prisma satisfaz a porta de repositorio e o gateway.
    PrismaVeiculoRepository,
    {
      provide: VEICULO_REPOSITORY,
      useExisting: PrismaVeiculoRepository,
    },
    {
      provide: VEICULO_GATEWAY,
      useExisting: PrismaVeiculoRepository,
    },
    // Gateway de consulta ao contexto de Cliente: ligado ao repositorio Prisma
    // ja existente (importado via ClienteModule).
    { provide: CLIENTE_CONSULTA_GATEWAY, useExisting: CLIENTE_REPOSITORY },
  ],
  exports: [VEICULO_REPOSITORY, VEICULO_GATEWAY],
})
export class VeiculoModule {}
