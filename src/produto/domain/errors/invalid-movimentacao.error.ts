import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class InvalidMovimentacaoError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(message: string) {
    super(message);
  }
}
