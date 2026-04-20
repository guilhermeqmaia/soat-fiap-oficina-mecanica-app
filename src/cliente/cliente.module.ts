import { Module } from "@nestjs/common";
import { ClienteService } from "./application/cliente.service";
import { ClienteController } from "./infrastructure/cliente.controller";
import { PrismaClienteRepository } from "./infrastructure/prisma-cliente.repository";
import { CLIENTE_REPOSITORY } from "./domain/cliente.repository";

@Module({
  controllers: [ClienteController],
  providers: [
    ClienteService,
    {
      provide: CLIENTE_REPOSITORY,
      useClass: PrismaClienteRepository,
    },
  ],
  exports: [ClienteService, CLIENTE_REPOSITORY],
})
export class ClienteModule {}
