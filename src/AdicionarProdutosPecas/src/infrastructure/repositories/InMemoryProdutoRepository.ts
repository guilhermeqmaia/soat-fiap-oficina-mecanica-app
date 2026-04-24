import { IProdutoRepository, ProdutoDTO } from '../../domain/produto/repositories/IProdutoRepository';

interface ProdutoInterno extends ProdutoDTO {
  quantidadeReservada: number;
}

/**
 * InMemoryProdutoRepository
 * Stub do BC de Estoque — uso exclusivo em desenvolvimento e testes.
 *
 * ⚠️  SUBSTITUIR pela implementação real fornecida pelo colega do BC de Estoque.
 *     Pode ser um adapter HTTP, uma chamada ao microserviço, ou acesso direto ao banco.
 */
export class InMemoryProdutoRepository implements IProdutoRepository {
  private readonly store: Map<string, ProdutoInterno>;

  constructor() {
    this.store = new Map<string, ProdutoInterno>([
      ['prod-001', { id: 'prod-001', nome: 'Filtro de Óleo',    valorUnitario: 35.90,  quantidadeDisponivel: 10, quantidadeReservada: 0 }],
      ['prod-002', { id: 'prod-002', nome: 'Pastilha de Freio', valorUnitario: 120.00, quantidadeDisponivel: 4,  quantidadeReservada: 0 }],
      ['prod-003', { id: 'prod-003', nome: 'Vela de Ignição',   valorUnitario: 28.50,  quantidadeDisponivel: 0,  quantidadeReservada: 0 }], // sem estoque
    ]);
  }

  async buscarPorId(id: string): Promise<ProdutoDTO | null> {
    return this.store.get(id) ?? null;
  }

  async verificarDisponibilidade(produtoId: string, quantidade: number): Promise<boolean> {
    const produto = this.store.get(produtoId);
    return produto ? produto.quantidadeDisponivel >= quantidade : false;
  }

  async reservarEstoque(produtoId: string, quantidade: number): Promise<void> {
    const produto = this.store.get(produtoId);
    if (!produto) throw new Error(`Produto ${produtoId} não encontrado para reserva.`);
    produto.quantidadeDisponivel -= quantidade;
    produto.quantidadeReservada += quantidade;
  }

  async estornarReserva(produtoId: string, quantidade: number): Promise<void> {
    const produto = this.store.get(produtoId);
    if (!produto) throw new Error(`Produto ${produtoId} não encontrado para estorno.`);
    produto.quantidadeDisponivel += quantidade;
    produto.quantidadeReservada -= quantidade;
  }
}
