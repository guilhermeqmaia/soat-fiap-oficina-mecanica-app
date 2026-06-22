import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class InvalidQuantityError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(quantidade: number) {
    super(`Quantidade invalida: ${quantidade}. Deve ser um inteiro maior que zero`);
  }
}
