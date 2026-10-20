import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class DuplicatePlacaError extends DomainError {
  readonly kind = DomainErrorKind.CONFLICT;

  constructor(placa: string) {
    super(`Ja existe um veiculo com a placa '${placa}'`);
  }
}
