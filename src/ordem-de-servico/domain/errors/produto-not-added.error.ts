export class ProdutoNotAddedError extends Error {
  constructor(produtoId: string) {
    super(`Produto '${produtoId}' nao esta nesta Ordem de Servico`);
    this.name = 'ProdutoNotAddedError';
  }
}
