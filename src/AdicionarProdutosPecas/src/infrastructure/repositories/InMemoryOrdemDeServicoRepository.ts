import { IOrdemDeServicoRepository } from '../../domain/ordemDeServico/repositories/IOrdemDeServicoRepository';
import { OrdemDeServico } from '../../domain/ordemDeServico/entities/OrdemDeServico';
import { StatusOrdemDeServico } from '../../domain/ordemDeServico/valueObjects/StatusOrdemDeServico';

/**
 * InMemoryOrdemDeServicoRepository
 * Implementação em memória — uso exclusivo em desenvolvimento e testes.
 *
 * ⚠️  SUBSTITUIR pela implementação real assim que o banco de dados for definido.
 *     Basta criar uma classe que implemente IOrdemDeServicoRepository.
 */
export class InMemoryOrdemDeServicoRepository implements IOrdemDeServicoRepository {
  private readonly store: Map<string, OrdemDeServico>;

  constructor() {
    this.store = new Map([
      [
        'os-001',
        new OrdemDeServico({
          id: 'os-001',
          status: StatusOrdemDeServico.EM_DIAGNOSTICO,
          mecanicoId: 'mecanico-01',
          veiculoId: 'veiculo-01',
        }),
      ],
      [
        'os-002',
        new OrdemDeServico({
          id: 'os-002',
          status: StatusOrdemDeServico.EM_EXECUCAO, // status diferente para testar regra
          mecanicoId: 'mecanico-02',
          veiculoId: 'veiculo-02',
        }),
      ],
    ]);
  }

  async buscarPorId(id: string): Promise<OrdemDeServico | null> {
    return this.store.get(id) ?? null;
  }

  async salvar(ordemDeServico: OrdemDeServico): Promise<void> {
    this.store.set(ordemDeServico.id, ordemDeServico);
  }
}
