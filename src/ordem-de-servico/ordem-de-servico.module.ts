import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClienteModule } from '../cliente/cliente.module';
import { VeiculoModule } from '../veiculo/veiculo.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { CLIENTE_REPOSITORY } from '../cliente/domain/cliente.repository';
import { VEICULO_REPOSITORY } from '../veiculo/domain/veiculo.repository';
import { USUARIO_REPOSITORY } from '../usuario/domain/usuario.repository';
import { OrdemDeServicoController } from './infrastructure/ordem-de-servico.controller';
import { ClienteOrdemDeServicoController } from './infrastructure/cliente-ordem-de-servico.controller';
import { PrismaOrdemDeServicoRepository } from './infrastructure/prisma-ordem-de-servico.repository';
import { PrismaAuditLogRepository } from './infrastructure/prisma-audit-log.repository';
import { ORDEM_DE_SERVICO_REPOSITORY } from './domain/ordem-de-servico.repository';
import { AUDIT_LOG_REPOSITORY } from './domain/audit-log.repository';
import { AuditLogService } from './application/audit-log.service';
import { OsAuditListener } from './application/listeners/os-audit.listener';
import { ORDEM_DE_SERVICO_GATEWAY } from './application/gateways/ordem-de-servico.gateway';
import {
  CLIENTE_CONSULTA_GATEWAY,
  USUARIO_CONSULTA_GATEWAY,
  VEICULO_CONSULTA_GATEWAY,
} from './application/gateways/consulta.gateways';
import { CriarOrdemDeServicoUseCase } from './application/use-cases/criar-ordem-de-servico.use-case';
import { ListarOrdensDeServicoUseCase } from './application/use-cases/listar-ordens-de-servico.use-case';
import { BuscarDetalhesOrdemDeServicoUseCase } from './application/use-cases/buscar-detalhes-ordem-de-servico.use-case';
import { BuscarStatusPorNumeroUseCase } from './application/use-cases/buscar-status-por-numero.use-case';
import { EntregarOrdemDeServicoUseCase } from './application/use-cases/entregar-ordem-de-servico.use-case';
import { CancelarOrdemDeServicoUseCase } from './application/use-cases/cancelar-ordem-de-servico.use-case';
import { DeletarOrdemDeServicoUseCase } from './application/use-cases/deletar-ordem-de-servico.use-case';
import { ListarHistoricoPorCpfCnpjUseCase } from './application/use-cases/listar-historico-por-cpf-cnpj.use-case';
import {
  RegistrarCancelamentoUseCase,
  RegistrarDiagnosticoUseCase,
  RegistrarEnfileiramentoUseCase,
  RegistrarExecucaoFinalizadaUseCase,
  RegistrarExecucaoIniciadaUseCase,
  RegistrarOrcamentoAprovadoUseCase,
  RegistrarOrcamentoGeradoUseCase,
} from './application/use-cases/transicoes';

const USE_CASES = [
  CriarOrdemDeServicoUseCase,
  ListarOrdensDeServicoUseCase,
  BuscarDetalhesOrdemDeServicoUseCase,
  BuscarStatusPorNumeroUseCase,
  EntregarOrdemDeServicoUseCase,
  CancelarOrdemDeServicoUseCase,
  DeletarOrdemDeServicoUseCase,
  ListarHistoricoPorCpfCnpjUseCase,
];

/** Transicoes dirigidas pelos eventos de Execucao/Billing (consumidos na US-F4-10/US-F4-06 parte 2). */
export const TRANSICOES_USE_CASES = [
  RegistrarEnfileiramentoUseCase,
  RegistrarDiagnosticoUseCase,
  RegistrarOrcamentoGeradoUseCase,
  RegistrarOrcamentoAprovadoUseCase,
  RegistrarExecucaoIniciadaUseCase,
  RegistrarExecucaoFinalizadaUseCase,
  RegistrarCancelamentoUseCase,
];

@Module({
  imports: [PrismaModule, ClienteModule, VeiculoModule, UsuarioModule],
  controllers: [OrdemDeServicoController, ClienteOrdemDeServicoController],
  providers: [
    ...USE_CASES,
    ...TRANSICOES_USE_CASES,
    AuditLogService,
    OsAuditListener,
    PrismaOrdemDeServicoRepository,
    PrismaAuditLogRepository,
    { provide: ORDEM_DE_SERVICO_REPOSITORY, useExisting: PrismaOrdemDeServicoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useExisting: PrismaAuditLogRepository },
    { provide: ORDEM_DE_SERVICO_GATEWAY, useExisting: PrismaOrdemDeServicoRepository },
    { provide: CLIENTE_CONSULTA_GATEWAY, useExisting: CLIENTE_REPOSITORY },
    { provide: VEICULO_CONSULTA_GATEWAY, useExisting: VEICULO_REPOSITORY },
    { provide: USUARIO_CONSULTA_GATEWAY, useExisting: USUARIO_REPOSITORY },
  ],
  exports: [ORDEM_DE_SERVICO_REPOSITORY, ORDEM_DE_SERVICO_GATEWAY, AuditLogService, ...TRANSICOES_USE_CASES],
})
export class OrdemDeServicoModule {}
