import { Module } from "@nestjs/common";
import { ClienteService } from "./cliente.service";
import { ClienteController } from "./cliente.controller";
import { PrismaClienteRepository } from "./prisma-cliente.repository";

@Module({
  controllers: [ClienteController],
  providers: [
    ClienteService,
    {
      provide: "ClienteRepository",
      useClass: PrismaClienteRepository,
    },
  ],
  exports: [ClienteService],
})
export class ClienteModule {}
