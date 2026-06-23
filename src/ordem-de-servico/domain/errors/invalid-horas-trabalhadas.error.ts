import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class InvalidHorasTrabalhadasError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor() {
    super('Horas trabalhadas deve ser maior que zero');
  }
}
