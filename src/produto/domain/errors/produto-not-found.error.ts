import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';

export class ProdutoNotFoundError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;

  constructor(id: string) {
    super(`Produto com id '${id}' nao encontrado`);
  }
}
