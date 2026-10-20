import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class DuplicateNameError extends DomainError {
  readonly kind = DomainErrorKind.CONFLICT;

  constructor(nome: string) {
    super(`Ja existe um servico com o nome '${nome}'`);
  }
}
