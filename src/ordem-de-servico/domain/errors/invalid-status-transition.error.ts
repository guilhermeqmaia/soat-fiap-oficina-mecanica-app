import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class InvalidStatusTransitionError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(currentStatus: string, targetStatus: string) {
    super(
      `Transicao invalida de status: nao e possivel ir de '${currentStatus}' para '${targetStatus}'`,
    );
  }
}
