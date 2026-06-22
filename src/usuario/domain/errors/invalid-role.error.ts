import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class InvalidRoleError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(role: string) {
    super(`Role ${role} é inválido`);
  }
}
