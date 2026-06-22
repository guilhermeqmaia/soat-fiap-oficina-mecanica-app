import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class DuplicatePlacaError extends DomainError {
  readonly kind = DomainErrorKind.CONFLICT;

  constructor(placa: string) {
    super(`Ja existe um veiculo com a placa '${placa}'`);
  }
}
