import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class DuplicateCpfCnpjError extends DomainError {
  readonly kind = DomainErrorKind.CONFLICT;

  constructor(cpfCnpj: string) {
    super(`Ja existe um cliente com o CPF/CNPJ '${cpfCnpj}'`);
  }
}
