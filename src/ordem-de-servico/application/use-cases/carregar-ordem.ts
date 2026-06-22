import { OrdemDeServico } from '../../domain/ordem-de-servico.entity';
import { OrdemDeServicoNotFoundError } from '../../domain/errors/ordem-de-servico-not-found.error';
import { OrdemDeServicoGateway } from '../gateways/ordem-de-servico.gateway';

/**
 * Helper interno compartilhado pelos use cases de mutacao: carrega a OS pelo id
 * ou lanca o erro de dominio NOT_FOUND. Mantem os use cases livres de
 * duplicacao sem que um use case dependa de outro.
 */
export async function carregarOrdemOuFalhar(
  gateway: OrdemDeServicoGateway,
  id: string,
): Promise<OrdemDeServico> {
  const ordem = await gateway.findById(id);
  if (!ordem) {
    throw new OrdemDeServicoNotFoundError(id);
  }
  return ordem;
}
