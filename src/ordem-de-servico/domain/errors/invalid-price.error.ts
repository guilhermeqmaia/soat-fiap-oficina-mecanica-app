import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class InvalidPriceError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(preco: number) {
    super(`Preco invalido: ${preco}. Deve ser maior ou igual a zero`);
  }
}
