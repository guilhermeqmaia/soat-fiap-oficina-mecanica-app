import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class DuplicateCpfCnpjError extends DomainError {
  readonly kind = DomainErrorKind.CONFLICT;

  constructor(cpfCnpj: string) {
    super(`Ja existe um cliente com o CPF/CNPJ '${cpfCnpj}'`);
  }
}
