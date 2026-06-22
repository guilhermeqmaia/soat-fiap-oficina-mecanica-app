import { OsNotOwnedByClienteError } from '../../domain/errors/os-not-owned-by-cliente.error';
import { ClienteConsultaGateway } from '../gateways/consulta.gateways';
import { OrdemDeServicoGateway } from '../gateways/ordem-de-servico.gateway';
import { carregarOrdemOuFalhar } from './carregar-ordem';

/**
 * Garante que a OS pertence ao cliente autenticado (comparando o email do
 * cliente dono da OS). Usado pelos use cases de aprovacao/rejeicao quando a
 * acao parte do proprio cliente. Lanca FORBIDDEN caso nao pertenca.
 */
export async function assertOsPertenceAoCliente(
  osGateway: OrdemDeServicoGateway,
  clienteGateway: ClienteConsultaGateway,
  ordemId: string,
  emailCliente: string,
): Promise<void> {
  const ordem = await carregarOrdemOuFalhar(osGateway, ordemId);
  const cliente = await clienteGateway.findById(ordem.clienteId);
  if (
    !cliente ||
    !cliente.email ||
    cliente.email.toLowerCase() !== emailCliente.toLowerCase()
  ) {
    throw new OsNotOwnedByClienteError(ordemId);
  }
}
