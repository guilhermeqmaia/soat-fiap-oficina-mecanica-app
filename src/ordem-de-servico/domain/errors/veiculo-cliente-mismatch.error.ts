import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class VeiculoClienteMismatchError extends DomainError {
  readonly kind = DomainErrorKind.CONFLICT;

  constructor(veiculoId: string, clienteId: string) {
    super(
      `Veiculo '${veiculoId}' nao pertence ao cliente '${clienteId}'`,
    );
  }
}
