import { DomainEventPublisher } from '@guilhermeqmaia/oficina-kit/core';
import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import { StatusOS } from '../../domain/value-objects/status-os.vo';
import { OsStatusAlteradoEvent } from '../../domain/events/os-status-alterado.event';
import { OsAcaoEvent } from '../../../shared/domain/events/os-acao.event';

/**
 * Helper interno compartilhado pelos use cases de mutacao: publica
 * OsStatusAlteradoEvent (notificacao, metricas) e OsAcaoEvent (audit log)
 * quando a transicao efetivamente alterou o status da OS.
 * Mantem a regra de "so notifica se mudou" em um unico lugar.
 */
export function publicarMudancaDeStatus(
  events: DomainEventPublisher,
  ordem: OrdemDeServico,
  statusAnterior: StatusOS,
  entradaNoStatusAnterior?: Date,
  usuarioId: string | null = null,
): void {
  if (!ordem.id || ordem.status === statusAnterior) {
    return;
  }

  events.publish(
    new OsStatusAlteradoEvent(
      ordem.id,
      ordem.numero,
      ordem.clienteId,
      statusAnterior,
      ordem.status,
      new Date(),
      entradaNoStatusAnterior,
    ),
  );
  events.publish(
    new OsAcaoEvent(
      ordem.id,
      ordem.numero,
      `${statusAnterior} -> ${ordem.status}`,
      statusAnterior,
      ordem.status,
      usuarioId,
      ordem.motivoCancelamento ? { motivoCancelamento: ordem.motivoCancelamento } : null,
    ),
  );
}
