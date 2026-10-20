import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class ProdutoNotAddedError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;

  constructor(produtoId: string) {
    super(`Produto '${produtoId}' nao esta nesta Ordem de Servico`);
  }
}
