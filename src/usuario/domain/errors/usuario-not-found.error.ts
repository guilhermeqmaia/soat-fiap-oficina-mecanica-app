import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class UsuarioNotFoundError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;

  constructor(id: string) {
    super(`Usuario com ID ${id} não encontrado`);
  }
}
