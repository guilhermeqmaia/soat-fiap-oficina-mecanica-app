import { OsNotOwnedByClienteError } from '../../domain/errors/os-not-owned-by-cliente.error';
import { ClienteConsultaGateway } from '../gateways/consulta.gateways';
import { OrdemDeServicoGateway } from '../gateways/ordem-de-servico.gateway';
import { carregarOrdemOuFalhar } from './carregar-ordem';

/**
 * Garante que a OS pertence ao cliente autenticado, comparando o CPF/CNPJ do
 * dono da OS com a claim `cpf` do token emitido pela Lambda (resource server —
 * US-F3-03; antes a comparacao era por e-mail do login local). Usado pelos use
 * cases de aprovacao/rejeicao quando a acao parte do proprio cliente.
 * Lanca FORBIDDEN caso nao pertenca.
 */
export async function assertOsPertenceAoCliente(
  osGateway: OrdemDeServicoGateway,
  clienteGateway: ClienteConsultaGateway,
  ordemId: string,
  cpfCnpjCliente: string,
): Promise<void> {
  const ordem = await carregarOrdemOuFalhar(osGateway, ordemId);
  const cliente = await clienteGateway.findById(ordem.clienteId);
  const soDigitos = (valor: string) => valor.replace(/\D/g, '');
  if (
    !cliente ||
    soDigitos(cliente.cpfCnpj.value) !== soDigitos(cpfCnpjCliente) ||
    soDigitos(cpfCnpjCliente) === ''
  ) {
    throw new OsNotOwnedByClienteError(ordemId);
  }
}
