import { DomainEventPublisher } from '@guilhermeqmaia/oficina-kit/core';
import { OrdemDeServico } from '../../../domain/ordem-de-servico.entity';
import { StatusOS } from '../../../domain/value-objects/status-os.vo';
import { OrdemDeServicoNotFoundError } from '../../../domain/errors/ordem-de-servico-not-found.error';
import { OrdemDeServicoGateway } from '../../gateways/ordem-de-servico.gateway';
import { publicarMudancaDeStatus } from '../publicar-mudanca-de-status';

/**
 * Esqueleto das transicoes disparadas por eventos de outros servicos
 * (ADR-0009: entrega at-least-once). Regra de idempotencia: se a OS ja esta no
 * status alvo, o evento e uma reentrega — nao faz nada e devolve a OS.
 */
export async function registrarTransicao(
  gateway: OrdemDeServicoGateway,
  events: DomainEventPublisher,
  numero: string,
  statusAlvo: StatusOS,
  aplicar: (ordem: OrdemDeServico) => void,
  tx?: unknown,
): Promise<{ ordem: OrdemDeServico; aplicada: boolean }> {
  const ordem = await gateway.findByNumero(numero, tx);
  if (!ordem) throw new OrdemDeServicoNotFoundError(numero);
  if (ordem.status === statusAlvo) return { ordem, aplicada: false };

  const statusAnterior = ordem.status;
  const entradaNoStatusAnterior = ordem.updatedAt ?? ordem.createdAt;
  aplicar(ordem);
  const updated = await gateway.update(ordem, tx);
  publicarMudancaDeStatus(events, updated, statusAnterior, entradaNoStatusAnterior);
  return { ordem: updated, aplicada: true };
}
