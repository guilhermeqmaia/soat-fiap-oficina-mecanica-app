import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';

export class VeiculoNotFoundError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;

  constructor(id: string) {
    super(`Veiculo com id '${id}' nao encontrado`);
  }
}
