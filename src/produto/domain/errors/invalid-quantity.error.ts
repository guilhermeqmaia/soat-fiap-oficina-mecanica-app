import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class InvalidQuantityError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(field: string) {
    super(`${field} deve ser um valor positivo ou zero`);
  }
}
