import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EstoqueBaixoEvent } from '../../domain/events/estoque-baixo.event';

/**
 * Listener para o EstoqueBaixoEvent.
 *
 * Responsabilidades atuais (MVP):
 * - Loga warning estruturado para observabilidade
 *
 * Extensoes futuras possiveis:
 * - Notificar gestores via NotificacaoModule (criar NotificacaoTipo
 *   ESTOQUE_BAIXO direcionada a usuarios com role ADMIN/GESTOR)
 * - Disparar alerta em dashboard real-time via WebSocket
 * - Integrar com sistema de compras automatico
 */
@Injectable()
export class EstoqueBaixoListener {
  private readonly logger = new Logger(EstoqueBaixoListener.name);

  @OnEvent(EstoqueBaixoEvent.EVENT_NAME)
  handle(event: EstoqueBaixoEvent): void {
    this.logger.warn(
      `[ALERTA ESTOQUE BAIXO] produto="${event.nomeProduto}" ` +
        `(id=${event.produtoId}): atual=${event.quantidadeAtual} ` +
        `<= minimo=${event.estoqueMinimo}`,
    );
  }
}
