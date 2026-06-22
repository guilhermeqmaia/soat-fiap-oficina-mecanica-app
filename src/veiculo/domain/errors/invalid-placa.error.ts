import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class InvalidPlacaError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(placa: string) {
    super(
      `Placa '${placa}' possui formato invalido. Use o formato brasileiro antigo (ABC-1234) ou Mercosul (ABC1D23)`,
    );
  }
}
