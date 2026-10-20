import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class VeiculoNotFoundError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;

  constructor(veiculoId: string) {
    super(`Veiculo com id '${veiculoId}' nao encontrado`);
  }
}
