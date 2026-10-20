import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class InvalidCpfCnpjError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(value: string) {
    super(`CPF/CNPJ invalido: '${value}'`);
  }
}
