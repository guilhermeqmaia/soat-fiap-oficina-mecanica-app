import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class InvalidQuantityError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(field: string) {
    super(`${field} deve ser um valor positivo ou zero`);
  }
}
