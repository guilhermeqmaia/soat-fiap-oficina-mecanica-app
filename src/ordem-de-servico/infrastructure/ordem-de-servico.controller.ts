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
  NotFoundException,
  BadRequestException,
  ConflictException,
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
import { OrdemDeServicoService } from '../application/ordem-de-servico.service';
import { CreateOrdemDeServicoDto } from './dto/create-ordem-de-servico.dto';
import { AdicionarDiagnosticoDto } from './dto/adicionar-diagnostico.dto';
import { CompletarDiagnosticoDto } from './dto/completar-diagnostico.dto';
import { QueryOrdemDeServicoDto } from './dto/query-ordem-de-servico.dto';
import { ClienteNotFoundError } from '../domain/errors/cliente-not-found.error';
import { VeiculoNotFoundError } from '../domain/errors/veiculo-not-found.error';
import { VeiculoClienteMismatchError } from '../domain/errors/veiculo-cliente-mismatch.error';
import { InvalidStatusTransitionError } from '../domain/errors/invalid-status-transition.error';
import { InvalidDescricaoError } from '../domain/errors/invalid-descricao.error';
import { OsNaoEmDiagnosticoError } from '../domain/errors/os-nao-em-diagnostico.error';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator';
import { Role } from '../../auth/domain/role.enum';

@ApiTags('Ordens de Servico')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token JWT ausente ou invalido' })
@ApiForbiddenResponse({ description: 'Role insuficiente' })
@Controller('ordens-servico')
export class OrdemDeServicoController {
  constructor(private readonly service: OrdemDeServicoService) {}

  @Post()
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Abrir nova ordem de servico' })
  @ApiCreatedResponse({ description: 'OS criada com sucesso' })
  @ApiNotFoundResponse({
    description: 'Cliente ou veiculo nao encontrado',
  })
  @ApiBadRequestResponse({ description: 'Dados invalidos' })
  @ApiConflictResponse({
    description: 'Veiculo nao pertence ao cliente',
  })
  async create(@Body() dto: CreateOrdemDeServicoDto) {
    try {
      return this.toResponse(await this.service.create(dto));
    } catch (error) {
      if (error instanceof ClienteNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof VeiculoNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof VeiculoClienteMismatchError) {
        throw new ConflictException(error.message);
      }
      if (error instanceof InvalidDescricaoError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({
    summary: 'Listar ordens de servico com paginacao e filtros',
  })
  @ApiOkResponse({ description: 'Lista paginada de OS' })
  async findAll(@Query() query: QueryOrdemDeServicoDto) {
    const result = await this.service.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      clienteId: query.clienteId,
      status: query.status,
    });

    return {
      data: result.data.map((os) => this.toResponse(os)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: 'Buscar ordem de servico por ID' })
  @ApiOkResponse({ description: 'OS encontrada' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.toResponse(await this.service.findById(id));
  }

  @Patch(':id/diagnostico')
  @Roles(Role.MECANICO, Role.ADMIN)
  @ApiOperation({ summary: 'Adicionar ou atualizar diagnostico da OS' })
  @ApiOkResponse({ description: 'Diagnostico registrado com sucesso' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  @ApiBadRequestResponse({
    description: 'OS nao esta em diagnostico ou diagnostico invalido',
  })
  async adicionarDiagnostico(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdicionarDiagnosticoDto,
  ) {
    try {
      return this.toResponse(
        await this.service.adicionarDiagnostico(id, dto.diagnostico),
      );
    } catch (error) {
      if (error instanceof OsNaoEmDiagnosticoError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof InvalidDescricaoError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post(':id/atribuir-mecanico')
  @Roles(Role.ADMIN, Role.MECANICO)
  @ApiOperation({ summary: 'Atribuir ordem de servico a um mecanico' })
  @ApiOkResponse({ description: 'OS atribuida com sucesso' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  @ApiBadRequestResponse({
    description: 'Transicao de status invalida',
  })
  async atribuirMecanico(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { usuarioId: string },
  ) {
    try {
      return this.toResponse(
        await this.service.atribuirMecanico(id, body.usuarioId),
      );
    } catch (error) {
      if (error instanceof InvalidStatusTransitionError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post(':id/completar-diagnostico')
  @Roles(Role.ADMIN, Role.MECANICO)
  @ApiOperation({
    summary: 'Completar diagnostico e gerar orcamento',
  })
  @ApiOkResponse({ description: 'Diagnostico completado com sucesso' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  @ApiBadRequestResponse({
    description: 'Transicao de status invalida ou diagnostico invalido',
  })
  async completarDiagnostico(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompletarDiagnosticoDto,
  ) {
    try {
      return this.toResponse(
        await this.service.completarDiagnostico(id, dto.diagnostico),
      );
    } catch (error) {
      if (error instanceof InvalidStatusTransitionError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof InvalidDescricaoError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post(':id/aprovar-orcamento')
  @Roles(Role.ADMIN, Role.CLIENTE)
  @ApiOperation({
    summary: 'Aprovar orcamento (cliente)',
  })
  @ApiOkResponse({ description: 'Orcamento aprovado com sucesso' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  @ApiBadRequestResponse({
    description: 'Transicao de status invalida',
  })
  async aprovarOrcamento(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return this.toResponse(await this.service.aprovarOrcamento(id));
    } catch (error) {
      if (error instanceof InvalidStatusTransitionError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post(':id/rejeitar-orcamento')
  @Roles(Role.ADMIN, Role.CLIENTE)
  @ApiOperation({
    summary: 'Rejeitar orcamento (cliente)',
  })
  @ApiOkResponse({ description: 'Orcamento rejeitado com sucesso' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  @ApiBadRequestResponse({
    description: 'Transicao de status invalida',
  })
  async rejeitarOrcamento(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return this.toResponse(await this.service.rejeitarOrcamento(id));
    } catch (error) {
      if (error instanceof InvalidStatusTransitionError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post(':id/finalizar-execucao')
  @Roles(Role.ADMIN, Role.MECANICO)
  @ApiOperation({
    summary: 'Finalizar execucao dos servicos',
  })
  @ApiOkResponse({ description: 'Execucao finalizada com sucesso' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  @ApiBadRequestResponse({
    description: 'Transicao de status invalida',
  })
  async finalizarExecucao(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return this.toResponse(await this.service.finalizarExecucao(id));
    } catch (error) {
      if (error instanceof InvalidStatusTransitionError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post(':id/entregar')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @ApiOperation({
    summary: 'Entregar veiculo (encerrar OS)',
  })
  @ApiOkResponse({ description: 'Veiculo entregue com sucesso' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  @ApiBadRequestResponse({
    description: 'Transicao de status invalida',
  })
  async entregar(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return this.toResponse(await this.service.entregar(id));
    } catch (error) {
      if (error instanceof InvalidStatusTransitionError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar ordem de servico' })
  @ApiOkResponse({ description: 'OS deletada com sucesso' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.delete(id);
  }

  private toResponse(os: any) {
    return {
      id: os.id,
      numero: os.numero,
      clienteId: os.clienteId,
      veiculoId: os.veiculoId,
      usuarioId: os.usuarioId,
      descricaoInicial: os.descricaoInicial,
      diagnostico: os.diagnostico,
      diagnosticoAt: os.diagnosticoAt,
      status: os.status,
      createdAt: os.createdAt,
      updatedAt: os.updatedAt,
    };
  }
}
