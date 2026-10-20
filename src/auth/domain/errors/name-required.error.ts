import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class NameRequiredError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor() {
    super('Nome do usuario e obrigatorio');
  }
}
