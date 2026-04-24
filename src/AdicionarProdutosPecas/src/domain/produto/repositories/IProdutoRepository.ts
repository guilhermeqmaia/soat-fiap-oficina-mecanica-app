/**
 * DTO: ProdutoDTO
 * Shape mínimo que o BC de Atendimento precisa do BC de Estoque.
 *
 * ⚠️  O colega do BC de Estoque pode expandir este tipo,
 *     mas os campos abaixo são obrigatórios para este módulo funcionar.
 */
export interface ProdutoDTO {
  id: string;
  nome: string;
  valorUnitario: number;
  quantidadeDisponivel: number;
}

/**
 * Interface: IProdutoRepository
 * Contrato para consultas ao BC de Estoque.
 *
 * ⚠️  Implementação a cargo do colega responsável pelo BC de Estoque.
 *     Pode ser um adapter HTTP, chamada ao microserviço ou acesso direto ao banco.
 */
export interface IProdutoRepository {
  /**
   * Busca um produto pelo ID.
   * Retorna null se não encontrado.
   */
  buscarPorId(id: string): Promise<ProdutoDTO | null>;

  /**
   * Verifica se há estoque disponível para a quantidade solicitada.
   */
  verificarDisponibilidade(produtoId: string, quantidade: number): Promise<boolean>;

  /**
   * Reserva uma quantidade do produto no estoque.
   * Deve ser idempotente — se já reservado, não duplica.
   */
  reservarEstoque(produtoId: string, quantidade: number): Promise<void>;

  /**
   * Estorna uma reserva de quantidade no estoque.
   */
  estornarReserva(produtoId: string, quantidade: number): Promise<void>;
}
