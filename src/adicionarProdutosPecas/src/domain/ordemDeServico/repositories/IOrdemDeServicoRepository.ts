import { OrdemDeServico } from '../entities/OrdemDeServico';

/**
 * Interface: IOrdemDeServicoRepository
 * Contrato que QUALQUER implementação de repositório de OS deve seguir.
 *
 * ⚠️  Implemente esta interface na camada de infrastructure
 *     conforme o banco de dados escolhido pelo grupo.
 */
export interface IOrdemDeServicoRepository {
  /**
   * Busca uma OS pelo ID.
   * Retorna null se não encontrada.
   */
  buscarPorId(id: string): Promise<OrdemDeServico | null>;

  /**
   * Persiste as alterações de uma OS já existente.
   */
  salvar(ordemDeServico: OrdemDeServico): Promise<void>;
}
