import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class ModeloRequiredError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor() {
    super("Modelo do veiculo e obrigatorio");
  }
}
