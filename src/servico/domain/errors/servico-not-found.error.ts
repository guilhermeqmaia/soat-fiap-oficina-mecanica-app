import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';

export class ServicoNotFoundError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;

  constructor(id: string) {
    super(`Servico com id '${id}' nao encontrado`);
  }
}
