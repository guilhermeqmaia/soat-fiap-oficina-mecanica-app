import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class InvalidDescriptionError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(message: string = 'Descricao invalida') {
    super(message);
  }
}
