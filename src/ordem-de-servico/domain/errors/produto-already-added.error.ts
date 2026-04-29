export class ProdutoAlreadyAddedError extends Error {
  constructor(produtoId: string) {
    super(`Produto '${produtoId}' ja foi adicionado a esta Ordem de Servico`);
    this.name = 'ProdutoAlreadyAddedError';
  }
}
