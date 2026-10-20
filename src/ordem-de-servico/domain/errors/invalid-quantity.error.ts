import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class InvalidQuantityError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(quantidade: number) {
    super(`Quantidade invalida: ${quantidade}. Deve ser um inteiro maior que zero`);
  }
}
