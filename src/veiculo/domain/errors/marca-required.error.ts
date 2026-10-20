import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class MarcaRequiredError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor() {
    super("Marca do veiculo e obrigatoria");
  }
}
