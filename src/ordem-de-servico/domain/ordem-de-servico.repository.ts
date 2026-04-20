import { OrdemDeServico } from './ordem-de-servico.entity';

export const ORDEM_DE_SERVICO_REPOSITORY = 'ORDEM_DE_SERVICO_REPOSITORY';

export interface FindAllParams {
  page?: number;
  limit?: number;
  clienteId?: string;
  status?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AdicionarItemInput {
  ordemDeServicoId: string;
  produtoId: string;
  quantidade: number;
  valorUnitario: number;
}

export interface OrdemDeServicoRepository {
  create(os: OrdemDeServico): Promise<OrdemDeServico>;
  findById(id: string): Promise<OrdemDeServico | null>;
  findAll(params: FindAllParams): Promise<PaginatedResult<OrdemDeServico>>;
  findByNumero(numero: string): Promise<OrdemDeServico | null>;
  update(os: OrdemDeServico): Promise<OrdemDeServico>;
  delete(id: string): Promise<void>;
  existsByNumero(numero: string): Promise<boolean>;

  /**
   * Adiciona item a OS, reserva estoque do produto e atualiza timestamps
   * dentro da mesma transacao (com lock pessimista sobre o produto).
   */
  adicionarItemProduto(input: AdicionarItemInput): Promise<void>;

  /**
   * Remove item da OS e estorna a reserva de estoque na mesma transacao.
   */
  removerItemProduto(ordemDeServicoId: string, produtoId: string): Promise<void>;
}
