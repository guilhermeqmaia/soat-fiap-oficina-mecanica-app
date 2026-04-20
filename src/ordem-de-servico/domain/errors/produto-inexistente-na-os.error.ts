export class ProdutoInexistenteNaOSError extends Error {
  constructor(produtoId: string) {
    super(`Produto com id '${produtoId}' nao esta vinculado a esta OS`);
    this.name = 'ProdutoInexistenteNaOSError';
  }
}
