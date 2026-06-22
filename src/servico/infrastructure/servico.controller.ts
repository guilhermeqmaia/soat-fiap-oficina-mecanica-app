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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreateServicoDto } from './dto/create-servico.dto';
import { UpdateServicoDto } from './dto/update-servico.dto';
import { QueryServicoDto } from './dto/query-servico.dto';
import { ServicoPresenter } from './presenters/servico.presenter';
import { CriarServicoUseCase } from '../application/use-cases/criar-servico.use-case';
import { ListarServicosUseCase } from '../application/use-cases/listar-servicos.use-case';
import { BuscarServicoPorIdUseCase } from '../application/use-cases/buscar-servico-por-id.use-case';
import { AtualizarServicoUseCase } from '../application/use-cases/atualizar-servico.use-case';
import { DeletarServicoUseCase } from '../application/use-cases/deletar-servico.use-case';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator';
import { Role } from '../../auth/domain/role.enum';

@ApiTags('Servicos')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token JWT ausente ou invalido' })
@ApiForbiddenResponse({ description: 'Role insuficiente' })
@Controller('servicos')
export class ServicoController {
  constructor(
    private readonly criarServico: CriarServicoUseCase,
    private readonly listarServicos: ListarServicosUseCase,
    private readonly buscarServicoPorId: BuscarServicoPorIdUseCase,
    private readonly atualizarServico: AtualizarServicoUseCase,
    private readonly deletarServico: DeletarServicoUseCase,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar um novo servico' })
  @ApiCreatedResponse({ description: 'Servico criado com sucesso' })
  @ApiConflictResponse({ description: 'Ja existe um servico com esse nome' })
  async create(@Body() dto: CreateServicoDto) {
    const servico = await this.criarServico.execute({
      nome: dto.nome,
      descricao: dto.descricao,
      precoBase: dto.precoBase,
      tempoEstimadoHoras: dto.tempoEstimadoHoras,
    });
    return ServicoPresenter.toResponse(servico);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO, Role.ESTOQUISTA)
  @ApiOperation({ summary: 'Listar servicos com paginacao e filtro' })
  @ApiOkResponse({ description: 'Lista de servicos paginada' })
  async findAll(@Query() query: QueryServicoDto) {
    const result = await this.listarServicos.execute({
      page: query.page!,
      limit: query.limit!,
      nome: query.nome,
    });
    return ServicoPresenter.toPaginatedResponse(result);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO, Role.ESTOQUISTA)
  @ApiOperation({ summary: 'Buscar servico por ID' })
  @ApiOkResponse({ description: 'Servico encontrado' })
  @ApiNotFoundResponse({ description: 'Servico nao encontrado' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    const servico = await this.buscarServicoPorId.execute({ id });
    return ServicoPresenter.toResponse(servico);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar um servico' })
  @ApiOkResponse({ description: 'Servico atualizado com sucesso' })
  @ApiNotFoundResponse({ description: 'Servico nao encontrado' })
  @ApiConflictResponse({ description: 'Ja existe um servico com esse nome' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServicoDto,
  ) {
    const servico = await this.atualizarServico.execute({
      id,
      nome: dto.nome,
      descricao: dto.descricao,
      precoBase: dto.precoBase,
      tempoEstimadoHoras: dto.tempoEstimadoHoras,
    });
    return ServicoPresenter.toResponse(servico);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover um servico' })
  @ApiOkResponse({ description: 'Servico removido com sucesso' })
  @ApiNotFoundResponse({ description: 'Servico nao encontrado' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.deletarServico.execute({ id });
  }
}
