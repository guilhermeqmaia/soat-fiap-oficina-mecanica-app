import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class NameRequiredError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor() {
    super('Nome do servico e obrigatorio');
  }
}
