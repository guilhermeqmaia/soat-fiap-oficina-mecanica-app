import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class UsuarioNotFoundError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;

  constructor(id: string) {
    super(`Usuario com ID ${id} não encontrado`);
  }
}
