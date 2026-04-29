export class ProdutoNotFoundInCatalogError extends Error {
  constructor(produtoId: string) {
    super(`Produto com id '${produtoId}' nao encontrado no catalogo`);
    this.name = 'ProdutoNotFoundInCatalogError';
  }
}
