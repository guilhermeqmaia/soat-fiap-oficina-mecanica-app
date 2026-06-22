import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class InvalidEmailError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(email: string) {
    super(`Email ${email} é inválido`);
  }
}
