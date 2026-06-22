import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class VeiculoClienteMismatchError extends DomainError {
  readonly kind = DomainErrorKind.CONFLICT;

  constructor(veiculoId: string, clienteId: string) {
    super(
      `Veiculo '${veiculoId}' nao pertence ao cliente '${clienteId}'`,
    );
  }
}
