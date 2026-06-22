import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class InvalidPriceError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(preco: number) {
    super(`Preco invalido: ${preco}. Deve ser maior ou igual a zero`);
  }
}
