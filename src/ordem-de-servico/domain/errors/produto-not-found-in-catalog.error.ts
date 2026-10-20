import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class ProdutoNotFoundInCatalogError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;

  constructor(produtoId: string) {
    super(`Produto com id '${produtoId}' nao encontrado no catalogo`);
  }
}
