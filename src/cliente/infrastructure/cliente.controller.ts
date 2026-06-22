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
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { QueryClienteDto } from './dto/query-cliente.dto';
import { ClientePresenter } from './presenters/cliente.presenter';
import { CriarClienteUseCase } from '../application/use-cases/criar-cliente.use-case';
import { ListarClientesUseCase } from '../application/use-cases/listar-clientes.use-case';
import { BuscarClientePorIdUseCase } from '../application/use-cases/buscar-cliente-por-id.use-case';
import { AtualizarClienteUseCase } from '../application/use-cases/atualizar-cliente.use-case';
import { DeletarClienteUseCase } from '../application/use-cases/deletar-cliente.use-case';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator';
import { Role } from '../../auth/domain/role.enum';

@ApiTags('Clientes')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token JWT ausente ou invalido' })
@ApiForbiddenResponse({ description: 'Role insuficiente' })
@Controller('clientes')
export class ClienteController {
  constructor(
    private readonly criarCliente: CriarClienteUseCase,
    private readonly listarClientes: ListarClientesUseCase,
    private readonly buscarClientePorId: BuscarClientePorIdUseCase,
    private readonly atualizarCliente: AtualizarClienteUseCase,
    private readonly deletarCliente: DeletarClienteUseCase,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastrar um novo cliente' })
  @ApiCreatedResponse({ description: 'Cliente criado com sucesso' })
  @ApiConflictResponse({ description: 'CPF/CNPJ ja cadastrado' })
  @ApiBadRequestResponse({
    description: 'CPF/CNPJ invalido ou dados obrigatorios ausentes',
  })
  async create(@Body() dto: CreateClienteDto) {
    const cliente = await this.criarCliente.execute(dto);
    return ClientePresenter.toResponse(cliente);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: 'Listar clientes com paginacao e filtro' })
  @ApiOkResponse({ description: 'Lista de clientes paginada' })
  async findAll(@Query() query: QueryClienteDto) {
    const result = await this.listarClientes.execute({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      nome: query.nome,
      cpf: query.cpf,
      cnpj: query.cnpj,
    });
    return ClientePresenter.toPaginatedResponse(result);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: 'Buscar cliente por ID' })
  @ApiOkResponse({ description: 'Cliente encontrado' })
  @ApiNotFoundResponse({ description: 'Cliente nao encontrado' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    const cliente = await this.buscarClientePorId.execute({ id });
    return ClientePresenter.toResponse(cliente);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @ApiOperation({ summary: 'Atualizar um cliente' })
  @ApiOkResponse({ description: 'Cliente atualizado com sucesso' })
  @ApiNotFoundResponse({ description: 'Cliente nao encontrado' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClienteDto,
  ) {
    const cliente = await this.atualizarCliente.execute({ id, props: dto });
    return ClientePresenter.toResponse(cliente);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover um cliente' })
  @ApiOkResponse({ description: 'Cliente removido com sucesso' })
  @ApiNotFoundResponse({ description: 'Cliente nao encontrado' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.deletarCliente.execute({ id });
  }
}
