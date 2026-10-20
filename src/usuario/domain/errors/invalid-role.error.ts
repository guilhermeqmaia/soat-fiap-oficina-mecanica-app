import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class InvalidRoleError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(role: string) {
    super(`Role ${role} é inválido`);
  }
}
