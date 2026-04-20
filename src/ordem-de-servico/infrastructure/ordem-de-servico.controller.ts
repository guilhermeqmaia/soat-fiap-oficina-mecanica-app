import {
  Body,
  Controller,
  Delete,
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
import {
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { OrdemDeServicoService } from '../application/ordem-de-servico.service';
import { CreateOrdemDeServicoDto } from './dto/create-ordem-de-servico.dto';
import { CompletarDiagnosticoDto } from './dto/completar-diagnostico.dto';
import { QueryOrdemDeServicoDto } from './dto/query-ordem-de-servico.dto';
import { AdicionarProdutoNaOSDto } from './dto/adicionar-produto-na-os.dto';
import { ClienteNotFoundError } from '../domain/errors/cliente-not-found.error';
import { VeiculoNotFoundError } from '../domain/errors/veiculo-not-found.error';
import { VeiculoClienteMismatchError } from '../domain/errors/veiculo-cliente-mismatch.error';
import { InvalidStatusTransitionError } from '../domain/errors/invalid-status-transition.error';
import { InvalidDescricaoError } from '../domain/errors/invalid-descricao.error';
import { OSNaoEncontradaError } from '../domain/errors/os-nao-encontrada.error';
import { ProdutoDuplicadoNaOSError } from '../domain/errors/produto-duplicado-na-os.error';
import { ProdutoInexistenteNaOSError } from '../domain/errors/produto-inexistente-na-os.error';
import { InsufficientStockError } from '../../produto/domain/errors/insufficient-stock.error';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator';
import { Role } from '../../auth/domain/role.enum';
import { OrdemDeServico } from '../domain/ordem-de-servico.entity';

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

  @Post(':id/produtos')
  @Roles(Role.ADMIN, Role.MECANICO)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Adiciona produto/peca a OS e reserva a quantidade no estoque',
  })
  @ApiCreatedResponse({ description: 'Produto adicionado a OS' })
  @ApiNotFoundResponse({ description: 'OS ou Produto nao encontrado' })
  @ApiConflictResponse({
    description: 'OS nao esta em EM_DIAGNOSTICO ou produto ja foi adicionado',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Estoque insuficiente para a quantidade solicitada',
  })
  async adicionarProduto(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdicionarProdutoNaOSDto,
  ) {
    try {
      return this.toResponse(
        await this.service.adicionarProduto(id, dto.produtoId, dto.quantidade),
      );
    } catch (error) {
      this.mapProdutoOnOSError(error);
    }
  }

  @Delete(':id/produtos/:produtoId')
  @Roles(Role.ADMIN, Role.MECANICO)
  @ApiOperation({
    summary: 'Remove produto da OS e estorna reserva de estoque',
  })
  @ApiOkResponse({ description: 'Produto removido da OS' })
  @ApiNotFoundResponse({ description: 'OS ou produto da OS nao encontrado' })
  @ApiConflictResponse({ description: 'OS nao esta em EM_DIAGNOSTICO' })
  async removerProduto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('produtoId', ParseUUIDPipe) produtoId: string,
  ) {
    try {
      return this.toResponse(await this.service.removerProduto(id, produtoId));
    } catch (error) {
      this.mapProdutoOnOSError(error);
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

  private mapProdutoOnOSError(error: unknown): never {
    if (error instanceof OSNaoEncontradaError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof ProdutoInexistenteNaOSError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof InvalidStatusTransitionError) {
      throw new ConflictException(error.message);
    }
    if (error instanceof ProdutoDuplicadoNaOSError) {
      throw new ConflictException(error.message);
    }
    if (error instanceof InsufficientStockError) {
      throw new ConflictException(error.message);
    }
    throw error;
  }

  private toResponse(os: OrdemDeServico | any) {
    return {
      id: os.id,
      numero: os.numero,
      clienteId: os.clienteId,
      veiculoId: os.veiculoId,
      usuarioId: os.usuarioId,
      descricaoInicial: os.descricaoInicial,
      diagnostico: os.diagnostico,
      status: os.status,
      createdAt: os.createdAt,
      updatedAt: os.updatedAt,
      itensProduto:
        os.itensProduto?.map(
          (i: {
            produtoId: string;
            nomeProduto: string;
            quantidade: number;
            valorUnitario: number;
            valorTotal: number;
          }) => ({
            produtoId: i.produtoId,
            nomeProduto: i.nomeProduto,
            quantidade: i.quantidade,
            valorUnitario: i.valorUnitario,
            valorTotal: i.valorTotal,
          }),
        ) ?? [],
      valorTotalProdutos: os.valorTotalProdutos ?? 0,
    };
  }
}
