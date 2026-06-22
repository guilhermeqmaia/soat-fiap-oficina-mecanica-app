import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class InvalidPriceError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor() {
    super('Preco deve ser um valor positivo');
  }
}
