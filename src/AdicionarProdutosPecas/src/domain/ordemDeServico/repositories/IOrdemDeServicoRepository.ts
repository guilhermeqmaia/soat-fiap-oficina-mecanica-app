import { OrdemDeServico } from '../entities/OrdemDeServico';

export interface IOrdemDeServicoRepository {
  buscarPorId(id: string): Promise<OrdemDeServico | null>;
  salvar(ordemDeServico: OrdemDeServico): Promise<void>;
}
