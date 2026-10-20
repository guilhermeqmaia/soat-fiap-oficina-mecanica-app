import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class InvalidEmailError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(email: string) {
    super(`Email ${email} é inválido`);
  }
}
