import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class ItemServicoInvalidStatusError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(servicoId: string, statusAtual: string, operacao: string) {
    super(
      `Servico '${servicoId}' com status '${statusAtual}' nao permite operacao '${operacao}'`,
    );
  }
}
