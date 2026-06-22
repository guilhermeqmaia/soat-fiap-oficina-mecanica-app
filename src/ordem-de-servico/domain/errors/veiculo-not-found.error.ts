import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class VeiculoNotFoundError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;

  constructor(veiculoId: string) {
    super(`Veiculo com id '${veiculoId}' nao encontrado`);
  }
}
