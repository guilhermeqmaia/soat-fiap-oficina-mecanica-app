import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';

export class SagaNotFoundError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;
  constructor(numero: string) {
    super(`Saga da ordem de servico '${numero}' nao encontrada`);
  }
}
