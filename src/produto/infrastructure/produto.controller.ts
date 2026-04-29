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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ProdutoService } from '../application/produto.service';
import { MovimentacaoEstoqueService } from '../application/movimentacao-estoque.service';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';
import { QueryProdutoDto } from './dto/query-produto.dto';
import { AddStockDto } from './dto/add-stock.dto';
import { EntradaEstoqueDto } from './dto/entrada-estoque.dto';
import { SaidaEstoqueDto } from './dto/saida-estoque.dto';
import { QueryMovimentacoesDto } from './dto/query-movimentacoes.dto';
import { MovimentacaoEstoqueResponseDto } from './dto/movimentacao-response.dto';
import { DuplicateNameError } from '../domain/errors/duplicate-name.error';
import { InsufficientStockError } from '../domain/errors/insufficient-stock.error';
import { MovimentacaoEstoque } from '../domain/movimentacao-estoque.entity';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../auth/infrastructure/decorators/current-user.decorator';
import { Usuario } from '../../auth/domain/usuario.entity';
import { Role } from '../../auth/domain/role.enum';

@ApiTags('Produtos')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token JWT ausente ou invalido' })
@ApiForbiddenResponse({ description: 'Role insuficiente' })
@Controller('produtos')
export class ProdutoController {
  constructor(
    private readonly service: ProdutoService,
    private readonly movimentacaoService: MovimentacaoEstoqueService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.ESTOQUISTA)
  @ApiOperation({ summary: 'Criar um novo produto' })
  @ApiCreatedResponse({ description: 'Produto criado com sucesso' })
  @ApiConflictResponse({ description: 'Ja existe um produto com esse nome' })
  async create(@Body() dto: CreateProdutoDto) {
    try {
      return this.toResponse(await this.service.create(dto));
    } catch (error) {
      if (error instanceof DuplicateNameError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  @Get('estoque-baixo')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.ESTOQUISTA)
  @ApiOperation({
    summary: 'Listar produtos com estoque abaixo do minimo',
  })
  @ApiOkResponse({ description: 'Lista de produtos com alerta de estoque' })
  async findLowStock() {
    const produtos = await this.service.findLowStock();
    return produtos.map((p) => this.toResponse(p));
  }

  @Get()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO, Role.ESTOQUISTA)
  @ApiOperation({ summary: 'Listar produtos com paginacao e filtro' })
  @ApiOkResponse({ description: 'Lista de produtos paginada' })
  async findAll(@Query() query: QueryProdutoDto) {
    const result = await this.service.findAll({
      page: query.page!,
      limit: query.limit!,
      nome: query.nome,
    });

    return {
      data: result.data.map((p) => this.toResponse(p)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO, Role.ESTOQUISTA)
  @ApiOperation({ summary: 'Buscar produto por ID' })
  @ApiOkResponse({ description: 'Produto encontrado' })
  @ApiNotFoundResponse({ description: 'Produto nao encontrado' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.toResponse(await this.service.findById(id));
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ESTOQUISTA)
  @ApiOperation({ summary: 'Atualizar um produto' })
  @ApiOkResponse({ description: 'Produto atualizado com sucesso' })
  @ApiNotFoundResponse({ description: 'Produto nao encontrado' })
  @ApiConflictResponse({ description: 'Ja existe um produto com esse nome' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProdutoDto,
  ) {
    try {
      return this.toResponse(await this.service.update(id, dto));
    } catch (error) {
      if (error instanceof DuplicateNameError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  @Post(':id/estoque')
  @Roles(Role.ADMIN, Role.ESTOQUISTA)
  @ApiOperation({
    summary: 'Adicionar quantidade ao estoque (legado, use /entrada)',
    deprecated: true,
  })
  @ApiOkResponse({ description: 'Estoque atualizado com sucesso' })
  @ApiNotFoundResponse({ description: 'Produto nao encontrado' })
  async addStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddStockDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.toResponse(
      await this.service.addStock(id, dto.quantidade, {
        usuarioId: usuario.id,
      }),
    );
  }

  @Post(':id/entrada')
  @Roles(Role.ADMIN, Role.ESTOQUISTA)
  @ApiOperation({
    summary: 'Registrar entrada de estoque (compra, ajuste, etc.)',
  })
  @ApiOkResponse({ description: 'Entrada registrada com sucesso' })
  @ApiNotFoundResponse({ description: 'Produto nao encontrado' })
  async entradaEstoque(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EntradaEstoqueDto,
    @CurrentUser() usuario: Usuario,
  ) {
    return this.toResponse(
      await this.service.addStock(id, dto.quantidade, {
        motivo: dto.motivo,
        usuarioId: usuario.id,
      }),
    );
  }

  @Post(':id/saida')
  @Roles(Role.ADMIN, Role.ESTOQUISTA)
  @ApiOperation({
    summary: 'Registrar saida manual de estoque (ajuste, perda)',
  })
  @ApiOkResponse({ description: 'Saida registrada com sucesso' })
  @ApiNotFoundResponse({ description: 'Produto nao encontrado' })
  @ApiConflictResponse({
    description: 'Quantidade excede o estoque disponivel',
  })
  async saidaEstoque(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaidaEstoqueDto,
    @CurrentUser() usuario: Usuario,
  ) {
    try {
      return this.toResponse(
        await this.service.removeStock(id, dto.quantidade, {
          motivo: dto.motivo,
          usuarioId: usuario.id,
        }),
      );
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  @Get(':id/movimentacoes')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.ESTOQUISTA)
  @ApiOperation({ summary: 'Listar movimentacoes de estoque do produto' })
  @ApiOkResponse({
    description: 'Movimentacoes paginadas',
    type: MovimentacaoEstoqueResponseDto,
    isArray: true,
  })
  async movimentacoes(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryMovimentacoesDto,
  ) {
    const result = await this.movimentacaoService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      produtoId: id,
      tipo: query.tipo,
    });
    return {
      data: result.data.map((m) => this.movimentacaoToResponse(m)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Post(':id/reservar')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: 'Reservar quantidade do estoque' })
  @ApiOkResponse({ description: 'Reserva realizada com sucesso' })
  @ApiNotFoundResponse({ description: 'Produto nao encontrado' })
  async reserveStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddStockDto,
  ) {
    try {
      return this.toResponse(await this.service.reserveStock(id, dto.quantidade));
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  @Post(':id/liberar')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: 'Liberar quantidade reservada do estoque' })
  @ApiOkResponse({ description: 'Liberacao realizada com sucesso' })
  @ApiNotFoundResponse({ description: 'Produto nao encontrado' })
  async releaseStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddStockDto,
  ) {
    return this.toResponse(await this.service.releaseStock(id, dto.quantidade));
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover um produto' })
  @ApiOkResponse({ description: 'Produto removido com sucesso' })
  @ApiNotFoundResponse({ description: 'Produto nao encontrado' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.delete(id);
  }

  private movimentacaoToResponse(
    m: MovimentacaoEstoque,
  ): MovimentacaoEstoqueResponseDto {
    return {
      id: m.id!,
      produtoId: m.produtoId,
      tipo: m.tipo,
      quantidade: m.quantidade,
      estoqueResultante: m.estoqueResultante,
      ordemDeServicoId: m.ordemDeServicoId,
      motivo: m.motivo,
      usuarioId: m.usuarioId,
      createdAt: m.createdAt!,
    };
  }

  private toResponse(produto: {
    id?: string;
    nome: string;
    descricao?: string | null;
    precoUnitario: { value: number };
    quantidadeEstoque: number;
    quantidadeReservada: number;
    quantidadeDisponivel: number;
    estoqueMinimo: number;
    ativo: boolean;
    isLowStock: () => boolean;
  }) {
    return {
      id: produto.id,
      nome: produto.nome,
      descricao: produto.descricao,
      precoUnitario: produto.precoUnitario.value,
      quantidadeEstoque: produto.quantidadeEstoque,
      quantidadeReservada: produto.quantidadeReservada,
      quantidadeDisponivel: produto.quantidadeDisponivel,
      estoqueMinimo: produto.estoqueMinimo,
      ativo: produto.ativo,
      alertaEstoqueBaixo: produto.isLowStock(),
    };
  }
}
