import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class ProdutoNotAddedError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;

  constructor(produtoId: string) {
    super(`Produto '${produtoId}' nao esta nesta Ordem de Servico`);
  }
}
