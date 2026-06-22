import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class InvalidCpfCnpjError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(value: string) {
    super(`CPF/CNPJ invalido: '${value}'`);
  }
}
