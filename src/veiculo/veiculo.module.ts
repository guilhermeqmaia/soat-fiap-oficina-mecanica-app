import { Module } from "@nestjs/common";
import { VeiculoService } from "./application/veiculo.service";
import { VeiculoController } from "./infrastructure/veiculo.controller";
import { ClienteVeiculoController } from "./infrastructure/cliente-veiculo.controller";
import { PrismaVeiculoRepository } from "./infrastructure/prisma-veiculo.repository";
import { VEICULO_REPOSITORY } from "./domain/veiculo.repository";
import { ClienteModule } from "../cliente/cliente.module";

@Module({
  imports: [ClienteModule], // Importa para injetar ClienteService
  controllers: [VeiculoController, ClienteVeiculoController],
  providers: [
    VeiculoService,
    {
      provide: VEICULO_REPOSITORY,
      useClass: PrismaVeiculoRepository,
    },
  ],
  exports: [VeiculoService, VEICULO_REPOSITORY],
})
export class VeiculoModule {}
