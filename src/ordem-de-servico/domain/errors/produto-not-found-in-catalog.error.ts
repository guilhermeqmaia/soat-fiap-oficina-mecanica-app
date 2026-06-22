import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class ProdutoNotFoundInCatalogError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;

  constructor(produtoId: string) {
    super(`Produto com id '${produtoId}' nao encontrado no catalogo`);
  }
}
