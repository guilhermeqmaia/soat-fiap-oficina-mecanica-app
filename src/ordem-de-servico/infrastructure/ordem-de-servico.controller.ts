import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { CompletarDiagnosticoDto } from './dto/completar-diagnostico.dto';
import { QueryOrdemDeServicoDto } from './dto/query-ordem-de-servico.dto';
import { AtribuirMecanicoDto } from './dto/atribuir-mecanico.dto';
import { AdicionarServicoDto } from './dto/adicionar-servico.dto';
import { ClienteNotFoundError } from '../domain/errors/cliente-not-found.error';
import { VeiculoNotFoundError } from '../domain/errors/veiculo-not-found.error';
import { VeiculoClienteMismatchError } from '../domain/errors/veiculo-cliente-mismatch.error';
import { InvalidStatusTransitionError } from '../domain/errors/invalid-status-transition.error';
import { InvalidDescriptionError } from '../domain/errors/invalid-description.error';
import { OsNotOwnedByClienteError } from '../domain/errors/os-not-owned-by-cliente.error';
import { ServicoNotFoundInCatalogError } from '../domain/errors/servico-not-found-in-catalog.error';
import { ServicoAlreadyAddedError } from '../domain/errors/servico-already-added.error';
import { ServicoNotAddedError } from '../domain/errors/servico-not-added.error';
import { InvalidQuantityError } from '../domain/errors/invalid-quantity.error';
import { OrdemDeServicoNotFoundError } from '../domain/errors/ordem-de-servico-not-found.error';
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
      if (error instanceof InvalidDescriptionError) {
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
      numero: query.numero,
    });

    return {
      data: result.data.map((os) => this.toResponse(os)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get('numero/:numero/status')
  @Public()
  @ApiOperation({
    summary:
      'Acompanhar OS pelo numero (publico, sem autenticacao) — US-16',
  })
  @ApiOkResponse({ description: 'Status e itens da OS' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada para o numero informado' })
  async findStatusByNumero(@Param('numero') numero: string) {
    try {
      return await this.service.findStatusByNumero(numero);
    } catch (error) {
      if (error instanceof OrdemDeServicoNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: 'Buscar ordem de servico por ID' })
  @ApiOkResponse({ description: 'OS encontrada' })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.toResponse(await this.service.findById(id));
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
    @Body() dto: AtribuirMecanicoDto,
  ) {
    try {
      return this.toResponse(
        await this.service.atribuirMecanico(id, dto.usuarioId),
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
      if (error instanceof InvalidDescriptionError) {
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
  async aprovarOrcamento(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: Usuario,
  ) {
    try {
      if (usuario?.role === Role.CLIENTE) {
        await this.service.assertOsPertenceAoCliente(id, usuario.email.value);
      }
      return this.toResponse(await this.service.aprovarOrcamento(id));
    } catch (error) {
      if (error instanceof OsNotOwnedByClienteError) {
        throw new ForbiddenException(error.message);
      }
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
  async rejeitarOrcamento(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: Usuario,
  ) {
    try {
      if (usuario?.role === Role.CLIENTE) {
        await this.service.assertOsPertenceAoCliente(id, usuario.email.value);
      }
      return this.toResponse(await this.service.rejeitarOrcamento(id));
    } catch (error) {
      if (error instanceof OsNotOwnedByClienteError) {
        throw new ForbiddenException(error.message);
      }
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
    try {
      return this.toResponse(
        await this.service.adicionarServico(id, dto.servicoId, dto.quantidade),
      );
    } catch (error) {
      if (error instanceof ServicoNotFoundInCatalogError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof ServicoAlreadyAddedError) {
        throw new ConflictException(error.message);
      }
      if (error instanceof InvalidStatusTransitionError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof InvalidQuantityError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
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
    try {
      await this.service.removerServico(id, servicoId);
    } catch (error) {
      if (error instanceof ServicoNotAddedError) {
        throw new NotFoundException(error.message);
      }
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
      status: os.status,
      itensServico: (os.itensServico ?? []).map((i: any) => ({
        servicoId: i.servicoId,
        quantidade: i.quantidade,
        precoUnitario: i.precoUnitario,
        subtotal: i.subtotal(),
      })),
      valorTotalServicos:
        typeof os.valorTotalServicos === 'function'
          ? os.valorTotalServicos()
          : 0,
      createdAt: os.createdAt,
      updatedAt: os.updatedAt,
    };
  }
}
