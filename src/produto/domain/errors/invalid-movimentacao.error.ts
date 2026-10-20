import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class InvalidMovimentacaoError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(message: string) {
    super(message);
  }
}
