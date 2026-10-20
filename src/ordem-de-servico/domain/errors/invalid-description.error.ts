import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class InvalidDescriptionError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(message: string = 'Descricao invalida') {
    super(message);
  }
}
