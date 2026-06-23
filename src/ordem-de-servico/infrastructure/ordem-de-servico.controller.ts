import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreateOrdemDeServicoDto } from './dto/create-ordem-de-servico.dto';
import { CompletarDiagnosticoDto } from './dto/completar-diagnostico.dto';
import { QueryOrdemDeServicoDto } from './dto/query-ordem-de-servico.dto';
import { AtribuirMecanicoDto } from './dto/atribuir-mecanico.dto';
import { AdicionarServicoDto } from './dto/adicionar-servico.dto';
import { AdicionarProdutoDto } from './dto/adicionar-produto.dto';
import { ConcluirServicoDto } from './dto/concluir-servico.dto';
import { QueryTempoMedioDto } from './dto/query-tempo-medio.dto';
import { OrdemDeServicoPresenter } from './presenters/ordem-de-servico.presenter';
import { CriarOrdemDeServicoUseCase } from '../application/use-cases/criar-ordem-de-servico.use-case';
import { ListarOrdensDeServicoUseCase } from '../application/use-cases/listar-ordens-de-servico.use-case';
import { ObterTempoMedioExecucaoUseCase } from '../application/use-cases/obter-tempo-medio-execucao.use-case';
import { BuscarDetalhesOrdemDeServicoUseCase } from '../application/use-cases/buscar-detalhes-ordem-de-servico.use-case';
import { BuscarStatusPorNumeroUseCase } from '../application/use-cases/buscar-status-por-numero.use-case';
import { AtribuirMecanicoUseCase } from '../application/use-cases/atribuir-mecanico.use-case';
import { CompletarDiagnosticoUseCase } from '../application/use-cases/completar-diagnostico.use-case';
import { AprovarOrcamentoUseCase } from '../application/use-cases/aprovar-orcamento.use-case';
import { RejeitarOrcamentoUseCase } from '../application/use-cases/rejeitar-orcamento.use-case';
import { IniciarServicoUseCase } from '../application/use-cases/iniciar-servico.use-case';
import { ConcluirServicoUseCase } from '../application/use-cases/concluir-servico.use-case';
import { FinalizarExecucaoUseCase } from '../application/use-cases/finalizar-execucao.use-case';
import { EntregarOrdemDeServicoUseCase } from '../application/use-cases/entregar-ordem-de-servico.use-case';
import { AdicionarServicoUseCase } from '../application/use-cases/adicionar-servico.use-case';
import { RemoverServicoUseCase } from '../application/use-cases/remover-servico.use-case';
import { AdicionarProdutoAoServicoUseCase } from '../application/use-cases/adicionar-produto-ao-servico.use-case';
import { RemoverProdutoDoServicoUseCase } from '../application/use-cases/remover-produto-do-servico.use-case';
import { DeletarOrdemDeServicoUseCase } from '../application/use-cases/deletar-ordem-de-servico.use-case';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../auth/infrastructure/decorators/public.decorator';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../auth/infrastructure/decorators/current-user.decorator';
import { Role } from '../../auth/domain/role.enum';
import { Usuario } from '../../auth/domain/usuario.entity';

@ApiTags('Ordens de Servico')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token JWT ausente ou invalido' })
@ApiForbiddenResponse({ description: 'Role insuficiente' })
@Controller('ordens-servico')
export class OrdemDeServicoController {
  constructor(
    private readonly criarOrdemDeServico: CriarOrdemDeServicoUseCase,
    private readonly listarOrdensDeServico: ListarOrdensDeServicoUseCase,
    private readonly obterTempoMedioExecucao: ObterTempoMedioExecucaoUseCase,
    private readonly buscarDetalhesOrdemDeServico: BuscarDetalhesOrdemDeServicoUseCase,
    private readonly buscarStatusPorNumero: BuscarStatusPorNumeroUseCase,
    private readonly atribuirMecanicoUseCase: AtribuirMecanicoUseCase,
    private readonly completarDiagnosticoUseCase: CompletarDiagnosticoUseCase,
    private readonly aprovarOrcamentoUseCase: AprovarOrcamentoUseCase,
    private readonly rejeitarOrcamentoUseCase: RejeitarOrcamentoUseCase,
    private readonly iniciarServicoUseCase: IniciarServicoUseCase,
    private readonly concluirServicoUseCase: ConcluirServicoUseCase,
    private readonly finalizarExecucaoUseCase: FinalizarExecucaoUseCase,
    private readonly entregarUseCase: EntregarOrdemDeServicoUseCase,
    private readonly adicionarServicoUseCase: AdicionarServicoUseCase,
    private readonly removerServicoUseCase: RemoverServicoUseCase,
    private readonly adicionarProdutoUseCase: AdicionarProdutoAoServicoUseCase,
    private readonly removerProdutoUseCase: RemoverProdutoDoServicoUseCase,
    private readonly deletarOrdemDeServicoUseCase: DeletarOrdemDeServicoUseCase,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Abrir nova ordem de servico' })
  @ApiCreatedResponse({ description: 'OS criada com sucesso' })
  @ApiNotFoundResponse({ description: 'Cliente ou veiculo nao encontrado' })
  @ApiBadRequestResponse({ description: 'Dados invalidos' })
  @ApiConflictResponse({ description: 'Veiculo nao pertence ao cliente' })
  async create(@Body() dto: CreateOrdemDeServicoDto) {
    const os = await this.criarOrdemDeServico.execute({
      clienteId: dto.clienteId,
      veiculoId: dto.veiculoId,
      descricaoInicial: dto.descricaoInicial,
    });
    return OrdemDeServicoPresenter.toResponse(os);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({
    summary: 'Listar ordens de servico com paginacao e filtros',
  })
  @ApiOkResponse({ description: 'Lista paginada de OS' })
  async findAll(@Query() query: QueryOrdemDeServicoDto) {
    const result = await this.listarOrdensDeServico.execute({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      clienteId: query.clienteId,
      status: query.status,
      numero: query.numero,
    });
    return OrdemDeServicoPresenter.toPaginatedResponse(result);
  }

  @Get('numero/:numero/status')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: 'Acompanhar OS pelo numero (publico, sem autenticacao) — US-16',
  })
  @ApiOkResponse({ description: 'Status e itens da OS' })
  @ApiNotFoundResponse({
    description: 'OS nao encontrada para o numero informado',
  })
  async findStatusByNumero(@Param('numero') numero: string) {
    return this.buscarStatusPorNumero.execute({ numero });
  }

  @Get('metricas/tempo-medio')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @ApiOperation({
    summary:
      'Tempo medio de execucao dos servicos (geral e por servico do catalogo) — US-17',
  })
  @ApiOkResponse({
    description:
      'Tempo medio em minutos/horas, total de execucoes concluidas e quebra por servico',
  })
  async tempoMedioExecucao(@Query() query: QueryTempoMedioDto) {
    return this.obterTempoMedioExecucao.execute({
      servicoId: query.servicoId,
      dataInicio: query.dataInicio,
      dataFim: query.dataFim,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({
    summary: 'Buscar ordem de servico por ID (cabecalho, corpo, rodape)',
  })
  @ApiOkResponse({ description: 'OS encontrada (view detalhada)' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.buscarDetalhesOrdemDeServico.execute({ id });
  }

  @Post(':id/atribuir-mecanico')
  @Roles(Role.ADMIN, Role.MECANICO)
  @ApiOperation({ summary: 'Atribuir ordem de servico a um mecanico' })
  @ApiOkResponse({ description: 'OS atribuida com sucesso' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  @ApiBadRequestResponse({ description: 'Transicao de status invalida' })
  async atribuirMecanico(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtribuirMecanicoDto,
  ) {
    const os = await this.atribuirMecanicoUseCase.execute({
      id,
      usuarioId: dto.usuarioId,
    });
    return OrdemDeServicoPresenter.toResponse(os);
  }

  @Post(':id/completar-diagnostico')
  @Roles(Role.ADMIN, Role.MECANICO)
  @ApiOperation({ summary: 'Completar diagnostico e gerar orcamento' })
  @ApiOkResponse({ description: 'Diagnostico completado com sucesso' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  @ApiBadRequestResponse({
    description: 'Transicao de status invalida ou diagnostico invalido',
  })
  async completarDiagnostico(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompletarDiagnosticoDto,
  ) {
    const os = await this.completarDiagnosticoUseCase.execute({
      id,
      diagnostico: dto.diagnostico,
    });
    return OrdemDeServicoPresenter.toResponse(os);
  }

  @Post(':id/aprovar-orcamento')
  @Roles(Role.ADMIN, Role.CLIENTE)
  @ApiOperation({ summary: 'Aprovar orcamento (cliente)' })
  @ApiOkResponse({ description: 'Orcamento aprovado com sucesso' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  @ApiBadRequestResponse({ description: 'Transicao de status invalida' })
  async aprovarOrcamento(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: Usuario,
  ) {
    const os = await this.aprovarOrcamentoUseCase.execute({
      id,
      emailClienteAutenticado:
        usuario?.role === Role.CLIENTE ? usuario.email.value : undefined,
    });
    return OrdemDeServicoPresenter.toResponse(os);
  }

  @Post(':id/rejeitar-orcamento')
  @Roles(Role.ADMIN, Role.CLIENTE)
  @ApiOperation({ summary: 'Rejeitar orcamento (cliente)' })
  @ApiOkResponse({ description: 'Orcamento rejeitado com sucesso' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  @ApiBadRequestResponse({ description: 'Transicao de status invalida' })
  async rejeitarOrcamento(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: Usuario,
  ) {
    const os = await this.rejeitarOrcamentoUseCase.execute({
      id,
      emailClienteAutenticado:
        usuario?.role === Role.CLIENTE ? usuario.email.value : undefined,
    });
    return OrdemDeServicoPresenter.toResponse(os);
  }

  @Post(':id/finalizar-execucao')
  @Roles(Role.ADMIN, Role.MECANICO)
  @ApiOperation({ summary: 'Finalizar execucao dos servicos' })
  @ApiOkResponse({ description: 'Execucao finalizada com sucesso' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  @ApiBadRequestResponse({ description: 'Transicao de status invalida' })
  async finalizarExecucao(@Param('id', ParseUUIDPipe) id: string) {
    const os = await this.finalizarExecucaoUseCase.execute({ id });
    return OrdemDeServicoPresenter.toResponse(os);
  }

  @Post(':id/entregar')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @ApiOperation({ summary: 'Entregar veiculo (encerrar OS)' })
  @ApiOkResponse({ description: 'Veiculo entregue com sucesso' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  @ApiBadRequestResponse({ description: 'Transicao de status invalida' })
  async entregar(@Param('id', ParseUUIDPipe) id: string) {
    const os = await this.entregarUseCase.execute({ id });
    return OrdemDeServicoPresenter.toResponse(os);
  }

  @Post(':id/servicos')
  @Roles(Role.ADMIN, Role.MECANICO)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar servico do catalogo a OS' })
  @ApiCreatedResponse({ description: 'Servico adicionado a OS com sucesso' })
  @ApiNotFoundResponse({ description: 'OS ou servico nao encontrado' })
  @ApiBadRequestResponse({
    description: 'Status invalido, quantidade invalida ou dados invalidos',
  })
  @ApiConflictResponse({ description: 'Servico ja adicionado a OS' })
  async adicionarServico(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdicionarServicoDto,
  ) {
    const os = await this.adicionarServicoUseCase.execute({
      id,
      servicoId: dto.servicoId,
      quantidade: dto.quantidade,
    });
    return OrdemDeServicoPresenter.toResponse(os);
  }

  @Patch(':id/servicos/:servicoId/iniciar')
  @Roles(Role.ADMIN, Role.MECANICO)
  @ApiOperation({ summary: 'Iniciar execucao de um servico da OS — US-14' })
  @ApiOkResponse({ description: 'Execucao do servico iniciada' })
  @ApiNotFoundResponse({ description: 'OS ou servico nao encontrado' })
  @ApiBadRequestResponse({
    description: 'Status invalido para iniciar execucao',
  })
  async iniciarServico(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('servicoId', ParseUUIDPipe) servicoId: string,
  ) {
    const os = await this.iniciarServicoUseCase.execute({ id, servicoId });
    return OrdemDeServicoPresenter.toResponse(os);
  }

  @Patch(':id/servicos/:servicoId/concluir')
  @Roles(Role.ADMIN, Role.MECANICO)
  @ApiOperation({ summary: 'Concluir execucao de um servico da OS — US-14' })
  @ApiOkResponse({
    description:
      'Servico concluido; se todos concluidos a OS passa a FINALIZADA automaticamente',
  })
  @ApiNotFoundResponse({ description: 'OS ou servico nao encontrado' })
  @ApiBadRequestResponse({ description: 'Status invalido ou horas invalidas' })
  async concluirServico(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('servicoId', ParseUUIDPipe) servicoId: string,
    @Body() dto: ConcluirServicoDto,
  ) {
    const os = await this.concluirServicoUseCase.execute({
      id,
      servicoId,
      horasTrabalhadas: dto.horasTrabalhadas,
    });
    return OrdemDeServicoPresenter.toResponse(os);
  }

  @Delete(':id/servicos/:servicoId')
  @Roles(Role.ADMIN, Role.MECANICO)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover servico da OS' })
  @ApiNotFoundResponse({ description: 'OS ou servico nao encontrado na OS' })
  @ApiBadRequestResponse({ description: 'Status invalido para remocao' })
  async removerServico(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('servicoId', ParseUUIDPipe) servicoId: string,
  ) {
    await this.removerServicoUseCase.execute({ id, servicoId });
  }

  @Post(':id/servicos/:servicoId/produtos')
  @Roles(Role.ADMIN, Role.MECANICO)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Adicionar produto do catalogo a um servico ja incluido na OS',
  })
  @ApiCreatedResponse({ description: 'Produto adicionado ao servico com sucesso' })
  @ApiNotFoundResponse({
    description: 'OS, servico (na OS) ou produto nao encontrado',
  })
  @ApiBadRequestResponse({
    description: 'Status invalido, quantidade invalida ou dados invalidos',
  })
  @ApiConflictResponse({ description: 'Produto ja adicionado a esse servico' })
  async adicionarProdutoAoServico(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('servicoId', ParseUUIDPipe) servicoId: string,
    @Body() dto: AdicionarProdutoDto,
  ) {
    const os = await this.adicionarProdutoUseCase.execute({
      id,
      servicoId,
      produtoId: dto.produtoId,
      quantidade: dto.quantidade,
    });
    return OrdemDeServicoPresenter.toResponse(os);
  }

  @Delete(':id/servicos/:servicoId/produtos/:produtoId')
  @Roles(Role.ADMIN, Role.MECANICO)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover produto de um servico da OS' })
  @ApiNotFoundResponse({
    description: 'OS, servico (na OS) ou produto nao encontrado',
  })
  @ApiBadRequestResponse({ description: 'Status invalido para remocao' })
  async removerProdutoDoServico(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('servicoId', ParseUUIDPipe) servicoId: string,
    @Param('produtoId', ParseUUIDPipe) produtoId: string,
  ) {
    await this.removerProdutoUseCase.execute({ id, servicoId, produtoId });
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar ordem de servico' })
  @ApiOkResponse({ description: 'OS deletada com sucesso' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.deletarOrdemDeServicoUseCase.execute({ id });
  }
}
