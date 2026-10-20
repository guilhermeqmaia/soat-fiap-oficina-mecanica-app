import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class ProdutoAlreadyAddedError extends DomainError {
  readonly kind = DomainErrorKind.CONFLICT;

  constructor(produtoId: string) {
    super(`Produto '${produtoId}' ja foi adicionado a esta Ordem de Servico`);
  }
}
