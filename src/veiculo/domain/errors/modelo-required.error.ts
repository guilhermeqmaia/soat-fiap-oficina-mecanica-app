import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class ModeloRequiredError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor() {
    super("Modelo do veiculo e obrigatorio");
  }
}
