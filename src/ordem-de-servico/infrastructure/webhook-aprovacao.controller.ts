import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { Public } from '../../auth/infrastructure/decorators/public.decorator';
import { WebhookTokenGuard } from './guards/webhook-token.guard';
import { WebhookAprovacaoDto } from './dto/webhook-aprovacao.dto';
import { AprovarOrcamentoUseCase } from '../application/use-cases/aprovar-orcamento.use-case';
import { RejeitarOrcamentoUseCase } from '../application/use-cases/rejeitar-orcamento.use-case';
import { OrdemDeServicoPresenter } from './presenters/ordem-de-servico.presenter';

@ApiTags('Webhooks')
@Controller('webhooks/ordens-servico')
export class WebhookAprovacaoController {
  constructor(
    private readonly aprovarOrcamentoUseCase: AprovarOrcamentoUseCase,
    private readonly rejeitarOrcamentoUseCase: RejeitarOrcamentoUseCase,
  ) {}

  @Post(':id/aprovacao')
  @Public()
  @UseGuards(WebhookTokenGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Webhook para aprovacao/reprovacao de orcamento (sem autenticacao JWT)',
    description:
      'Recebe a decisao de aprovacao ou reprovacao do orcamento via sistema externo (portal do cliente, gateway de email/SMS). ' +
      'Protegido por token no header X-Webhook-Token.',
  })
  @ApiHeader({
    name: 'X-Webhook-Token',
    description: 'Token de autenticacao do webhook (WEBHOOK_APPROVAL_TOKEN)',
    required: true,
  })
  @ApiOkResponse({ description: 'Status da OS atualizado com sucesso' })
  @ApiUnauthorizedResponse({
    description: 'Token de webhook invalido ou ausente',
  })
  @ApiNotFoundResponse({ description: 'OS nao encontrada' })
  @ApiBadRequestResponse({
    description:
      'Transicao de status invalida (ex.: OS nao esta em AGUARDANDO_APROVACAO)',
  })
  async aprovacao(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WebhookAprovacaoDto,
  ) {
    if (dto.aprovado) {
      const os = await this.aprovarOrcamentoUseCase.execute({ id });
      return OrdemDeServicoPresenter.toResponse(os);
    }

    const os = await this.rejeitarOrcamentoUseCase.execute({ id });
    return OrdemDeServicoPresenter.toResponse(os);
  }
}
