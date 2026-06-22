import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class InvalidAnoError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor() {
    super("Ano do veiculo deve estar entre 1886 e o ano seguinte ao atual");
  }
}
