import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class EmailAlreadyExistsError extends DomainError {
  readonly kind = DomainErrorKind.CONFLICT;

  constructor(email: string) {
    super(`Email ${email} já está registrado`);
  }
}
