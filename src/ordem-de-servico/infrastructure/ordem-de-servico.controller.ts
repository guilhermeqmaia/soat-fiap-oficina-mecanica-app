import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public, Roles, Role } from '@guilhermeqmaia/oficina-kit/auth';
import { AuditLogService } from '../application/audit-log.service';
import { CreateOrdemDeServicoDto } from './dto/create-ordem-de-servico.dto';
import { CancelarOrdemDeServicoDto } from './dto/cancelar-ordem-de-servico.dto';
import { QueryOrdemDeServicoDto } from './dto/query-ordem-de-servico.dto';
import { OrdemDeServicoPresenter } from './presenters/ordem-de-servico.presenter';
import { CriarOrdemDeServicoUseCase } from '../application/use-cases/criar-ordem-de-servico.use-case';
import { ListarOrdensDeServicoUseCase } from '../application/use-cases/listar-ordens-de-servico.use-case';
import { BuscarDetalhesOrdemDeServicoUseCase } from '../application/use-cases/buscar-detalhes-ordem-de-servico.use-case';
import { BuscarStatusPorNumeroUseCase } from '../application/use-cases/buscar-status-por-numero.use-case';
import { EntregarOrdemDeServicoUseCase } from '../application/use-cases/entregar-ordem-de-servico.use-case';
import { CancelarOrdemDeServicoUseCase } from '../application/use-cases/cancelar-ordem-de-servico.use-case';
import { DeletarOrdemDeServicoUseCase } from '../application/use-cases/deletar-ordem-de-servico.use-case';

/**
 * OS Service (Fase 4): apenas o ciclo de vida que e do Atendimento. Diagnostico,
 * itens e execucao ficam no Execucao Service (/execucao, /catalogo, /estoque);
 * orcamento, aprovacao e pagamento no Billing (/orcamentos, /pagamentos). As
 * transicoes correspondentes chegam por evento (ver application/use-cases/transicoes).
 */
@ApiTags('Ordens de Servico')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token JWT ausente ou invalido' })
@ApiForbiddenResponse({ description: 'Role insuficiente' })
@Controller('ordens-servico')
export class OrdemDeServicoController {
  constructor(
    private readonly criarOrdemDeServico: CriarOrdemDeServicoUseCase,
    private readonly listarOrdensDeServico: ListarOrdensDeServicoUseCase,
    private readonly buscarDetalhesOrdemDeServico: BuscarDetalhesOrdemDeServicoUseCase,
    private readonly buscarStatusPorNumero: BuscarStatusPorNumeroUseCase,
    private readonly entregarUseCase: EntregarOrdemDeServicoUseCase,
    private readonly cancelarUseCase: CancelarOrdemDeServicoUseCase,
    private readonly deletarOrdemDeServicoUseCase: DeletarOrdemDeServicoUseCase,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Abrir nova ordem de servico (inicia a saga: enfileira na Execucao)' })
  @ApiCreatedResponse({ description: 'OS criada com sucesso' })
  @ApiNotFoundResponse({ description: 'Cliente ou veiculo nao encontrado' })
  @ApiBadRequestResponse({ description: 'Dados invalidos' })
  @ApiConflictResponse({ description: 'Veiculo nao pertence ao cliente' })
  async create(@Body() dto: CreateOrdemDeServicoDto) {
    const os = await this.criarOrdemDeServico.execute(dto);
    return OrdemDeServicoPresenter.toResponse(os);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({
    summary: 'Listar ordens de servico com paginacao, filtros e ordenacao por prioridade de status',
    description:
      'Ordem: EM_EXECUCAO > AGUARDANDO_PAGAMENTO > AGUARDANDO_APROVACAO > EM_DIAGNOSTICO > RECEBIDA; mais antigas primeiro. ' +
      'FINALIZADA/ENTREGUE/CANCELADA ficam de fora por padrao (incluirEncerradas=true para incluir).',
  })
  @ApiOkResponse({ description: 'Lista paginada de OS' })
  async findAll(@Query() query: QueryOrdemDeServicoDto) {
    const result = await this.listarOrdensDeServico.execute({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      clienteId: query.clienteId,
      status: query.status,
      numero: query.numero,
      incluirEncerradas: query.incluirEncerradas,
    });
    return OrdemDeServicoPresenter.toPaginatedResponse(result);
  }

  @Get('numero/:numero/status')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Acompanhar OS pelo numero (publico, sem autenticacao) — US-16' })
  @ApiOkResponse({ description: 'Status e itens (snapshot) da OS' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada para o numero informado' })
  async findStatusByNumero(@Param('numero') numero: string) {
    return this.buscarStatusPorNumero.execute({ numero });
  }

  @Get(':id/audit-log')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @ApiOperation({ summary: 'Listar audit log da OS (transicoes e acoes registradas)' })
  @ApiOkResponse({ description: 'Log em ordem cronologica' })
  async findAuditLog(@Param('id', ParseUUIDPipe) id: string) {
    const logs = await this.auditLogService.findByOrdemDeServicoId(id);
    return logs.map((log) => ({
      id: log.id,
      acao: log.acao,
      statusAnterior: log.statusAnterior,
      statusNovo: log.statusNovo,
      usuarioId: log.usuarioId,
      metadata: log.metadata,
      createdAt: log.createdAt,
    }));
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: 'Buscar ordem de servico por ID (cabecalho, corpo, rodape)' })
  @ApiOkResponse({ description: 'OS encontrada (view detalhada)' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.buscarDetalhesOrdemDeServico.execute({ id });
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

  @Post(':id/cancelar')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @ApiOperation({ summary: 'Cancelar OS (so antes da execucao comecar; dispara as compensacoes da saga)' })
  @ApiOkResponse({ description: 'OS cancelada' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  @ApiBadRequestResponse({ description: 'OS ja em execucao/finalizada — nao pode ser cancelada' })
  async cancelar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelarOrdemDeServicoDto) {
    const os = await this.cancelarUseCase.execute({ id, motivo: dto.motivo });
    return OrdemDeServicoPresenter.toResponse(os);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar ordem de servico' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.deletarOrdemDeServicoUseCase.execute({ id });
  }
}
