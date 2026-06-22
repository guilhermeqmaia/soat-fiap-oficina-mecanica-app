import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class MarcaRequiredError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor() {
    super("Marca do veiculo e obrigatoria");
  }
}
