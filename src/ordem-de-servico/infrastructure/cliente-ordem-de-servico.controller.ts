import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Query,
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
import { OrdemDeServicoService } from '../application/ordem-de-servico.service';
import { QueryOrdemDeServicoDto } from './dto/query-ordem-de-servico.dto';
import { ClienteNotFoundError } from '../domain/errors/cliente-not-found.error';
import { ClienteNotOwnedByUsuarioError } from '../domain/errors/cliente-not-owned-by-usuario.error';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator';
import { CurrentUser } from '../../auth/infrastructure/decorators/current-user.decorator';
import { Role } from '../../auth/domain/role.enum';
import { Usuario } from '../../auth/domain/usuario.entity';

const CPF_CNPJ_DIGITS_REGEX = /^\d{11}(\d{3})?$/;

@ApiTags('Ordens de Servico')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token JWT ausente ou invalido' })
@ApiForbiddenResponse({ description: 'Role insuficiente ou CPF/CNPJ nao pertence ao usuario' })
@Controller('clientes')
export class ClienteOrdemDeServicoController {
  constructor(private readonly service: OrdemDeServicoService) {}

  @Get(':cpfCnpj/ordens-servico')
  @Roles(Role.CLIENTE)
  @ApiOperation({
    summary: 'Historico de OS do cliente autenticado (US-16)',
  })
  @ApiOkResponse({ description: 'Lista paginada de OS do cliente' })
  @ApiNotFoundResponse({ description: 'Cliente nao encontrado pelo CPF/CNPJ' })
  async findByCpfCnpj(
    @Param('cpfCnpj') cpfCnpj: string,
    @Query() query: QueryOrdemDeServicoDto,
    @CurrentUser() usuario: Usuario,
  ) {
    if (!CPF_CNPJ_DIGITS_REGEX.test(cpfCnpj)) {
      throw new BadRequestException(
        'CPF/CNPJ deve conter apenas digitos (11 para CPF ou 14 para CNPJ)',
      );
    }

    try {
      return await this.service.findByCpfCnpj(cpfCnpj, usuario.email.value, {
        page: query.page ?? 1,
        limit: query.limit ?? 10,
      });
    } catch (error) {
      if (error instanceof ClienteNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof ClienteNotOwnedByUsuarioError) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }
}
