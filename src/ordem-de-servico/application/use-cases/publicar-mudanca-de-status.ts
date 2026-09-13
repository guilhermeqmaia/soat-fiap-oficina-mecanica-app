import { DomainEventPublisher } from "../../../shared/application/domain-event-publisher";
import { OrdemDeServico } from "../../domain/ordem-de-servico.entity";
import { StatusOS } from "../../domain/value-objects/status-os.vo";
import { OsStatusAlteradoEvent } from "../../domain/events/os-status-alterado.event";

/**
 * Helper interno compartilhado pelos use cases de mutacao: publica o evento
 * OsStatusAlteradoEvent quando a transicao efetivamente alterou o status da OS.
 * Mantem a regra de "so notifica se mudou" em um unico lugar.
 */
export function publicarMudancaDeStatus(
  events: DomainEventPublisher,
  ordem: OrdemDeServico,
  statusAnterior: StatusOS,
  entradaNoStatusAnterior?: Date,
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
}
