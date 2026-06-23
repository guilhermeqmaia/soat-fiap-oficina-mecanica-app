import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class InvalidStatusError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(status: string) {
    super(`Status de OS invalido: ${status}`);
  }
}
