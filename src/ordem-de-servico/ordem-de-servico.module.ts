import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClienteModule } from '../cliente/cliente.module';
import { VeiculoModule } from '../veiculo/veiculo.module';
import { ServicoModule } from '../servico/servico.module';
import { ProdutoModule } from '../produto/produto.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { CLIENTE_REPOSITORY } from '../cliente/domain/cliente.repository';
import { VEICULO_REPOSITORY } from '../veiculo/domain/veiculo.repository';
import { SERVICO_REPOSITORY } from '../servico/domain/servico.repository';
import { PRODUTO_REPOSITORY } from '../produto/domain/produto.repository';
import { USUARIO_REPOSITORY } from '../usuario/domain/usuario.repository';
import { OrdemDeServicoController } from './infrastructure/ordem-de-servico.controller';
import { ClienteOrdemDeServicoController } from './infrastructure/cliente-ordem-de-servico.controller';
import { PrismaOrdemDeServicoRepository } from './infrastructure/prisma-ordem-de-servico.repository';
import { ORDEM_DE_SERVICO_REPOSITORY } from './domain/ordem-de-servico.repository';
import { ORDEM_DE_SERVICO_GATEWAY } from './application/gateways/ordem-de-servico.gateway';
import {
  CLIENTE_CONSULTA_GATEWAY,
  PRODUTO_CONSULTA_GATEWAY,
  SERVICO_CONSULTA_GATEWAY,
  USUARIO_CONSULTA_GATEWAY,
  VEICULO_CONSULTA_GATEWAY,
} from './application/gateways/consulta.gateways';
import { CriarOrdemDeServicoUseCase } from './application/use-cases/criar-ordem-de-servico.use-case';
import { ListarOrdensDeServicoUseCase } from './application/use-cases/listar-ordens-de-servico.use-case';
import { ObterTempoMedioExecucaoUseCase } from './application/use-cases/obter-tempo-medio-execucao.use-case';
import { BuscarDetalhesOrdemDeServicoUseCase } from './application/use-cases/buscar-detalhes-ordem-de-servico.use-case';
import { BuscarStatusPorNumeroUseCase } from './application/use-cases/buscar-status-por-numero.use-case';
import { AtribuirMecanicoUseCase } from './application/use-cases/atribuir-mecanico.use-case';
import { CompletarDiagnosticoUseCase } from './application/use-cases/completar-diagnostico.use-case';
import { AprovarOrcamentoUseCase } from './application/use-cases/aprovar-orcamento.use-case';
import { RejeitarOrcamentoUseCase } from './application/use-cases/rejeitar-orcamento.use-case';
import { IniciarServicoUseCase } from './application/use-cases/iniciar-servico.use-case';
import { ConcluirServicoUseCase } from './application/use-cases/concluir-servico.use-case';
import { FinalizarExecucaoUseCase } from './application/use-cases/finalizar-execucao.use-case';
import { EntregarOrdemDeServicoUseCase } from './application/use-cases/entregar-ordem-de-servico.use-case';
import { AdicionarServicoUseCase } from './application/use-cases/adicionar-servico.use-case';
import { RemoverServicoUseCase } from './application/use-cases/remover-servico.use-case';
import { AdicionarProdutoAoServicoUseCase } from './application/use-cases/adicionar-produto-ao-servico.use-case';
import { RemoverProdutoDoServicoUseCase } from './application/use-cases/remover-produto-do-servico.use-case';
import { DeletarOrdemDeServicoUseCase } from './application/use-cases/deletar-ordem-de-servico.use-case';
import { ListarHistoricoPorCpfCnpjUseCase } from './application/use-cases/listar-historico-por-cpf-cnpj.use-case';

const USE_CASES = [
  CriarOrdemDeServicoUseCase,
  ListarOrdensDeServicoUseCase,
  ObterTempoMedioExecucaoUseCase,
  BuscarDetalhesOrdemDeServicoUseCase,
  BuscarStatusPorNumeroUseCase,
  AtribuirMecanicoUseCase,
  CompletarDiagnosticoUseCase,
  AprovarOrcamentoUseCase,
  RejeitarOrcamentoUseCase,
  IniciarServicoUseCase,
  ConcluirServicoUseCase,
  FinalizarExecucaoUseCase,
  EntregarOrdemDeServicoUseCase,
  AdicionarServicoUseCase,
  RemoverServicoUseCase,
  AdicionarProdutoAoServicoUseCase,
  RemoverProdutoDoServicoUseCase,
  DeletarOrdemDeServicoUseCase,
  ListarHistoricoPorCpfCnpjUseCase,
];

@Module({
  imports: [
    PrismaModule,
    ClienteModule,
    VeiculoModule,
    ServicoModule,
    ProdutoModule,
    UsuarioModule,
  ],
  controllers: [OrdemDeServicoController, ClienteOrdemDeServicoController],
  providers: [
    ...USE_CASES,
    // Persistencia: o adapter Prisma satisfaz a porta de repositorio e o gateway.
    PrismaOrdemDeServicoRepository,
    {
      provide: ORDEM_DE_SERVICO_REPOSITORY,
      useExisting: PrismaOrdemDeServicoRepository,
    },
    {
      provide: ORDEM_DE_SERVICO_GATEWAY,
      useExisting: PrismaOrdemDeServicoRepository,
    },
    // Gateways de consulta a outros contextos: ligados aos repositorios Prisma
    // ja existentes (importados via seus modulos).
    { provide: CLIENTE_CONSULTA_GATEWAY, useExisting: CLIENTE_REPOSITORY },
    { provide: VEICULO_CONSULTA_GATEWAY, useExisting: VEICULO_REPOSITORY },
    { provide: SERVICO_CONSULTA_GATEWAY, useExisting: SERVICO_REPOSITORY },
    { provide: PRODUTO_CONSULTA_GATEWAY, useExisting: PRODUTO_REPOSITORY },
    { provide: USUARIO_CONSULTA_GATEWAY, useExisting: USUARIO_REPOSITORY },
  ],
  exports: [ORDEM_DE_SERVICO_REPOSITORY, ORDEM_DE_SERVICO_GATEWAY],
})
export class OrdemDeServicoModule {}
