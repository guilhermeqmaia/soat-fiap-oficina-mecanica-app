import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class EmailAlreadyExistsError extends DomainError {
  readonly kind = DomainErrorKind.CONFLICT;

  constructor(email: string) {
    super(`Email ${email} já está registrado`);
  }
}
