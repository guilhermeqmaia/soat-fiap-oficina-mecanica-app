import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class InvalidCredentialsError extends DomainError {
  readonly kind = DomainErrorKind.UNAUTHORIZED;

  constructor() {
    super('Credenciais invalidas');
  }
}
