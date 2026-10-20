import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class PhoneRequiredError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor() {
    super("Telefone do cliente e obrigatorio");
  }
}
