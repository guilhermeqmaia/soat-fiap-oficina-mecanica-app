import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Query,
  Param,
  ParseUUIDPipe,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    private readonly configService: ConfigService,
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

  @Get(':id/aprovar')
  @Public()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({
    summary: 'Aprovar orcamento por link de e-mail',
    description:
      'Endpoint GET para uso em links de e-mail. Protegido por token na query string.',
  })
  async aprovarPorEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token?: string,
  ): Promise<string> {
    this.validarTokenQuery(token);
    const os = await this.aprovarOrcamentoUseCase.execute({ id });
    return this.renderResultadoHtml(
      'Orcamento aprovado',
      `A Ordem de Servico ${os.numero} foi aprovada. A oficina ja pode iniciar a execucao.`,
    );
  }

  @Get(':id/rejeitar')
  @Public()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({
    summary: 'Rejeitar orcamento por link de e-mail',
    description:
      'Endpoint GET para uso em links de e-mail. Protegido por token na query string.',
  })
  async rejeitarPorEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token?: string,
  ): Promise<string> {
    this.validarTokenQuery(token);
    const os = await this.rejeitarOrcamentoUseCase.execute({ id });
    return this.renderResultadoHtml(
      'Orcamento rejeitado',
      `A Ordem de Servico ${os.numero} foi rejeitada e cancelada.`,
    );
  }

  private validarTokenQuery(token?: string): void {
    const expected = this.configService.get<string>('WEBHOOK_APPROVAL_TOKEN');
    if (!expected || token !== expected) {
      throw new UnauthorizedException('Token de aprovacao invalido');
    }
  }

  private renderResultadoHtml(titulo: string, mensagem: string): string {
    return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${this.escapeHtml(titulo)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
      main { max-width: 560px; margin: 10vh auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px; }
      h1 { margin: 0 0 12px; font-size: 24px; }
      p { line-height: 1.5; }
      a { color: #1d4ed8; }
    </style>
  </head>
  <body>
    <main>
      <h1>${this.escapeHtml(titulo)}</h1>
      <p>${this.escapeHtml(mensagem)}</p>
      <p>Voce ja pode fechar esta aba.</p>
    </main>
  </body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
