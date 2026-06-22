import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class InvalidEstimatedTimeError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor() {
    super('Tempo estimado deve ser um valor positivo');
  }
}
