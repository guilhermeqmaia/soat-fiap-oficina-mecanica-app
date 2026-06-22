import { Module } from '@nestjs/common';
import { PrismaClienteRepository } from './infrastructure/prisma-cliente.repository';
import { ClienteController } from './infrastructure/cliente.controller';
import { CLIENTE_REPOSITORY } from './domain/cliente.repository';
import { CLIENTE_GATEWAY } from './application/gateways/cliente.gateway';
import { CriarClienteUseCase } from './application/use-cases/criar-cliente.use-case';
import { ListarClientesUseCase } from './application/use-cases/listar-clientes.use-case';
import { BuscarClientePorIdUseCase } from './application/use-cases/buscar-cliente-por-id.use-case';
import { AtualizarClienteUseCase } from './application/use-cases/atualizar-cliente.use-case';
import { DeletarClienteUseCase } from './application/use-cases/deletar-cliente.use-case';

const USE_CASES = [
  CriarClienteUseCase,
  ListarClientesUseCase,
  BuscarClientePorIdUseCase,
  AtualizarClienteUseCase,
  DeletarClienteUseCase,
];

@Module({
  controllers: [ClienteController],
  providers: [
    ...USE_CASES,
    // Persistencia: o adapter Prisma satisfaz a porta de repositorio e o gateway.
    PrismaClienteRepository,
    {
      provide: CLIENTE_REPOSITORY,
      useExisting: PrismaClienteRepository,
    },
    {
      provide: CLIENTE_GATEWAY,
      useExisting: PrismaClienteRepository,
    },
  ],
  exports: [CLIENTE_REPOSITORY, CLIENTE_GATEWAY],
})
export class ClienteModule {}
