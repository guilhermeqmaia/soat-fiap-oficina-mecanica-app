import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class OrdemDeServicoNotFoundError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;

  constructor(identifier: string) {
    super(`Ordem de Servico '${identifier}' nao encontrada`);
  }
}
