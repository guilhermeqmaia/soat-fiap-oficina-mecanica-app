import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class ClienteNotOwnedByUsuarioError extends DomainError {
  readonly kind = DomainErrorKind.FORBIDDEN;

  constructor(cpfCnpj: string) {
    super(`Cliente com CPF/CNPJ '${cpfCnpj}' nao pertence ao usuario autenticado`);
  }
}
