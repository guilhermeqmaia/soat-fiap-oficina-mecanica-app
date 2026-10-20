import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class ClienteNotFoundError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;

  constructor(clienteId: string) {
    super(`Cliente com id '${clienteId}' nao encontrado`);
  }
}
