import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';

export class VeiculoNotFoundError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;

  constructor(id: string) {
    super(`Veiculo com id '${id}' nao encontrado`);
  }
}
