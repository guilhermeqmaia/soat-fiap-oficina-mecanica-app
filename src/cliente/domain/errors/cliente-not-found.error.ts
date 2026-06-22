import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';

export class ClienteNotFoundError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;

  constructor(id: string) {
    super(`Cliente com id '${id}' nao encontrado`);
  }
}
