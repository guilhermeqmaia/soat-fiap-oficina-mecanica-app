import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class DuplicateNameError extends DomainError {
  readonly kind = DomainErrorKind.CONFLICT;

  constructor(nome: string) {
    super(`Ja existe um servico com o nome '${nome}'`);
  }
}
