import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OsStatusAlteradoEvent } from '../../ordem-de-servico/domain/events/os-status-alterado.event';
import { integracaoResultados, osTransicoes } from '../metrics.registry';

/**
 * Traduz eventos de dominio em metricas de negocio (US-F3-10) — volume de OS
 * por status e erros de integracao, que alimentam os dashboards da US-F3-11.
 *
 * Listener proprio, separado dos de notificacao/estoque: observabilidade nao
 * pode alterar o comportamento do fluxo nem falhar junto com ele.
 */
@Injectable()
export class OsMetricsListener {
  @OnEvent(OsStatusAlteradoEvent.EVENT_NAME)
  onStatusAlterado(event: OsStatusAlteradoEvent): void {
    osTransicoes.inc({
      de: String(event.statusAnterior),
      para: String(event.statusAtual),
    });
  }

  /** Chamado pelos adapters de integracao para marcar sucesso/falha. */
  static registrarIntegracao(integracao: string, resultado: 'sucesso' | 'falha'): void {
    integracaoResultados.inc({ integracao, resultado });
  }
}
