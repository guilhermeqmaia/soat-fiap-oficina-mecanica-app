import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { VeiculoPresenter } from './presenters/veiculo.presenter';
import { ListarVeiculosPorClienteUseCase } from '../application/use-cases/listar-veiculos-por-cliente.use-case';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator';
import { Role } from '../../auth/domain/role.enum';

@ApiTags('Clientes')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token JWT ausente ou invalido' })
@ApiForbiddenResponse({ description: 'Role insuficiente' })
@Controller('clientes')
export class ClienteVeiculoController {
  constructor(
    private readonly listarVeiculosPorCliente: ListarVeiculosPorClienteUseCase,
  ) {}

  @Get(':clienteId/veiculos')
  @Roles(Role.ADMIN, Role.ATENDENTE, Role.MECANICO)
  @ApiOperation({ summary: 'Listar veiculos de um cliente' })
  @ApiOkResponse({ description: 'Lista de veiculos do cliente' })
  @ApiNotFoundResponse({ description: 'Cliente nao encontrado' })
  async findByCliente(@Param('clienteId', ParseUUIDPipe) clienteId: string) {
    const veiculos = await this.listarVeiculosPorCliente.execute({ clienteId });
    return VeiculoPresenter.toResponseList(veiculos);
  }
}
