import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';

export class ClienteNotFoundError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;

  constructor(id: string) {
    super(`Cliente com id '${id}' nao encontrado`);
  }
}
