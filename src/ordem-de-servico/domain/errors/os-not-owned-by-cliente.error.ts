import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class OsNotOwnedByClienteError extends DomainError {
  readonly kind = DomainErrorKind.FORBIDDEN;

  constructor(ordemId: string) {
    super(
      `Ordem de Servico '${ordemId}' nao pertence ao cliente autenticado`,
    );
  }
}
