import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class ClienteNotOwnedByUsuarioError extends DomainError {
  readonly kind = DomainErrorKind.FORBIDDEN;

  constructor(cpfCnpj: string) {
    super(`Cliente com CPF/CNPJ '${cpfCnpj}' nao pertence ao usuario autenticado`);
  }
}
