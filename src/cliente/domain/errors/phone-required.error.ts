import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class PhoneRequiredError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor() {
    super("Telefone do cliente e obrigatorio");
  }
}
