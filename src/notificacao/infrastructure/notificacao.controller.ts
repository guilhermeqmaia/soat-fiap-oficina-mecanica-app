import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '../../auth/domain/role.enum';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator';
import { NotificacaoService } from '../application/notificacao.service';
import { Notificacao } from '../domain/notificacao.entity';
import { NotificacaoResponseDto } from './dto/notificacao-response.dto';
import { QueryNotificacaoDto } from './dto/query-notificacao.dto';

@ApiTags('Notificacoes')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token JWT ausente ou invalido' })
@ApiForbiddenResponse({ description: 'Role insuficiente' })
@Controller('notificacoes')
export class NotificacaoController {
  constructor(private readonly service: NotificacaoService) {}

  @Get()
  @Roles(Role.ADMIN, Role.ATENDENTE)
  @ApiOperation({ summary: 'Listar historico de notificacoes enviadas' })
  @ApiOkResponse({
    description: 'Notificacoes paginadas',
    type: NotificacaoResponseDto,
    isArray: true,
  })
  async findAll(@Query() query: QueryNotificacaoDto) {
    const result = await this.service.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      clienteId: query.clienteId,
      ordemDeServicoId: query.ordemDeServicoId,
    });

    return {
      data: result.data.map((n) => this.toResponse(n)),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  private toResponse(notificacao: Notificacao): NotificacaoResponseDto {
    return {
      id: notificacao.id!,
      clienteId: notificacao.clienteId,
      ordemDeServicoId: notificacao.ordemDeServicoId,
      tipo: notificacao.tipo,
      canal: notificacao.canal,
      destinatario: notificacao.destinatario,
      assunto: notificacao.assunto,
      mensagem: notificacao.mensagem,
      status: notificacao.status,
      erro: notificacao.erro,
      enviadaEm: notificacao.enviadaEm,
      createdAt: notificacao.createdAt!,
    };
  }
}
