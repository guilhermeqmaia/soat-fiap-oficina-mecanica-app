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
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';
import { QueryProdutoDto } from './dto/query-produto.dto';
import { AddStockDto } from './dto/add-stock.dto';
import { EntradaEstoqueDto } from './dto/entrada-estoque.dto';
import { SaidaEstoqueDto } from './dto/saida-estoque.dto';
import { QueryMovimentacoesDto } from './dto/query-movimentacoes.dto';
import { MovimentacaoEstoqueResponseDto } from './dto/movimentacao-response.dto';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../auth/infrastructure/decorators/current-user.decorator';
import { Usuario } from '../../auth/domain/usuario.entity';
import { Role } from '../../auth/domain/role.enum';
import { CriarProdutoUseCase } from '../application/use-cases/criar-produto.use-case';
import { ListarProdutosUseCase } from '../application/use-cases/listar-produtos.use-case';
import { BuscarProdutoPorIdUseCase } from '../application/use-cases/buscar-produto-por-id.use-case';
import { ListarProdutosEstoqueBaixoUseCase } from '../application/use-cases/listar-produtos-estoque-baixo.use-case';
import { AtualizarProdutoUseCase } from '../application/use-cases/atualizar-produto.use-case';
import { DeletarProdutoUseCase } from '../application/use-cases/deletar-produto.use-case';
import { AdicionarEstoqueUseCase } from '../application/use-cases/adicionar-estoque.use-case';
import { RemoverEstoqueUseCase } from '../application/use-cases/remover-estoque.use-case';
import { ReservarEstoqueUseCase } from '../application/use-cases/reservar-estoque.use-case';
import { LiberarEstoqueUseCase } from '../application/use-cases/liberar-estoque.use-case';
import { ListarMovimentacoesUseCase } from '../application/use-cases/listar-movimentacoes.use-case';
import { ProdutoPresenter } from './presenters/produto.presenter';
import { MovimentacaoPresenter } from './presenters/movimentacao.presenter';

@ApiTags('Produtos')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token JWT ausente ou invalido' })
@ApiForbiddenResponse({ description: 'Role insuficiente' })
@Controller('produtos')
export class ProdutoController {
  constructor(
    private readonly criarProduto: CriarProdutoUseCase,
    private readonly listarProdutos: ListarProdutosUseCase,
    private readonly buscarProdutoPorId: BuscarProdutoPorIdUseCase,
    private readonly listarEstoqueBaixo: ListarProdutosEstoqueBaixoUseCase,
    private readonly atualizarProduto: AtualizarProdutoUseCase,
    private readonly deletarProduto: DeletarProdutoUseCase,
    private readonly adicionarEstoque: AdicionarEstoqueUseCase,
    private readonly removerEstoque: RemoverEstoqueUseCase,
    private readonly reservarEstoque: ReservarEstoqueUseCase,
    private readonly liberarEstoque: LiberarEstoqueUseCase,
    private readonly listarMovimentacoes: ListarMovimentacoesUseCase,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.ESTOQUISTA)
  @ApiOperation({ summary: 'Criar um novo produto' })
  @ApiCreatedResponse({ description: 'Produto criado com sucesso' })
  @ApiConflictResponse({ description: 'Ja existe um produto com esse nome' })
  async create(@Body() dto: CreateProdutoDto) {
    const produto = await this.criarProduto.execute(dto);
    return ProdutoPresenter.toResponse(produto);
  }

  @Get('estoque-baixo')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.ESTOQUISTA)
  @ApiOperation({
    summary: 'Listar produtos com estoque abaixo do minimo',
  })
  @ApiOkResponse({ description: 'Lista de produtos com alerta de estoque' })
  async findLowStock() {
    const produtos = await this.listarEstoqueBaixo.execute();
    return ProdutoPresenter.toResponseList(produtos);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO, Role.ESTOQUISTA)
  @ApiOperation({ summary: 'Listar produtos com paginacao e filtro' })
  @ApiOkResponse({ description: 'Lista de produtos paginada' })
  async findAll(@Query() query: QueryProdutoDto) {
    const result = await this.listarProdutos.execute({
      page: query.page!,
      limit: query.limit!,
      nome: query.nome,
    });
    return ProdutoPresenter.toPaginatedResponse(result);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO, Role.ESTOQUISTA)
  @ApiOperation({ summary: 'Buscar produto por ID' })
  @ApiOkResponse({ description: 'Produto encontrado' })
  @ApiNotFoundResponse({ description: 'Produto nao encontrado' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    const produto = await this.buscarProdutoPorId.execute({ id });
    return ProdutoPresenter.toResponse(produto);
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
    const produto = await this.atualizarProduto.execute({ id, props: dto });
    return ProdutoPresenter.toResponse(produto);
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
    const produto = await this.adicionarEstoque.execute({
      id,
      quantidade: dto.quantidade,
      ctx: { usuarioId: usuario.id },
    });
    return ProdutoPresenter.toResponse(produto);
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
    const produto = await this.adicionarEstoque.execute({
      id,
      quantidade: dto.quantidade,
      ctx: { motivo: dto.motivo, usuarioId: usuario.id },
    });
    return ProdutoPresenter.toResponse(produto);
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
    const produto = await this.removerEstoque.execute({
      id,
      quantidade: dto.quantidade,
      ctx: { motivo: dto.motivo, usuarioId: usuario.id },
    });
    return ProdutoPresenter.toResponse(produto);
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
    const result = await this.listarMovimentacoes.execute({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      produtoId: id,
      tipo: query.tipo,
    });
    return MovimentacaoPresenter.toPaginatedResponse(result);
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
    const produto = await this.reservarEstoque.execute({
      id,
      quantidade: dto.quantidade,
    });
    return ProdutoPresenter.toResponse(produto);
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
    const produto = await this.liberarEstoque.execute({
      id,
      quantidade: dto.quantidade,
    });
    return ProdutoPresenter.toResponse(produto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover um produto' })
  @ApiOkResponse({ description: 'Produto removido com sucesso' })
  @ApiNotFoundResponse({ description: 'Produto nao encontrado' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.deletarProduto.execute({ id });
  }
}
