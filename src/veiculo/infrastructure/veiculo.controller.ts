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
import { CreateVeiculoDto } from './dto/create-veiculo.dto';
import { UpdateVeiculoDto } from './dto/update-veiculo.dto';
import { QueryVeiculoDto } from './dto/query-veiculo.dto';
import { VeiculoPresenter } from './presenters/veiculo.presenter';
import { CriarVeiculoUseCase } from '../application/use-cases/criar-veiculo.use-case';
import { ListarVeiculosUseCase } from '../application/use-cases/listar-veiculos.use-case';
import { BuscarVeiculoPorIdUseCase } from '../application/use-cases/buscar-veiculo-por-id.use-case';
import { AtualizarVeiculoUseCase } from '../application/use-cases/atualizar-veiculo.use-case';
import { DeletarVeiculoUseCase } from '../application/use-cases/deletar-veiculo.use-case';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator';
import { Role } from '../../auth/domain/role.enum';

@ApiTags('Veiculos')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token JWT ausente ou invalido' })
@ApiForbiddenResponse({ description: 'Role insuficiente' })
@Controller('veiculos')
export class VeiculoController {
  constructor(
    private readonly criarVeiculo: CriarVeiculoUseCase,
    private readonly listarVeiculos: ListarVeiculosUseCase,
    private readonly buscarVeiculoPorId: BuscarVeiculoPorIdUseCase,
    private readonly atualizarVeiculo: AtualizarVeiculoUseCase,
    private readonly deletarVeiculo: DeletarVeiculoUseCase,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @ApiOperation({ summary: 'Cadastrar um novo veiculo' })
  @ApiCreatedResponse({ description: 'Veiculo criado com sucesso' })
  @ApiConflictResponse({ description: 'Ja existe um veiculo com essa placa' })
  @ApiNotFoundResponse({ description: 'Cliente nao encontrado' })
  async create(@Body() dto: CreateVeiculoDto) {
    const veiculo = await this.criarVeiculo.execute(dto);
    return VeiculoPresenter.toResponse(veiculo);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: 'Listar veiculos com paginacao e filtro' })
  @ApiOkResponse({ description: 'Lista de veiculos paginada' })
  async findAll(@Query() query: QueryVeiculoDto) {
    const result = await this.listarVeiculos.execute({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      marca: query.marca,
      placa: query.placa,
    });
    return VeiculoPresenter.toPaginatedResponse(result);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: 'Buscar veiculo por ID' })
  @ApiOkResponse({ description: 'Veiculo encontrado' })
  @ApiNotFoundResponse({ description: 'Veiculo nao encontrado' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    const veiculo = await this.buscarVeiculoPorId.execute({ id });
    return VeiculoPresenter.toResponse(veiculo);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @ApiOperation({ summary: 'Atualizar um veiculo' })
  @ApiOkResponse({ description: 'Veiculo atualizado com sucesso' })
  @ApiNotFoundResponse({ description: 'Veiculo nao encontrado' })
  @ApiConflictResponse({ description: 'Ja existe um veiculo com essa placa' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVeiculoDto,
  ) {
    const veiculo = await this.atualizarVeiculo.execute({ id, ...dto });
    return VeiculoPresenter.toResponse(veiculo);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover um veiculo' })
  @ApiOkResponse({ description: 'Veiculo removido com sucesso' })
  @ApiNotFoundResponse({ description: 'Veiculo nao encontrado' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.deletarVeiculo.execute({ id });
  }
}
