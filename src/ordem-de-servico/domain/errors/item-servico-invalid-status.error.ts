import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class ItemServicoInvalidStatusError extends DomainError {
  readonly kind = DomainErrorKind.INVALID_INPUT;

  constructor(servicoId: string, statusAtual: string, operacao: string) {
    super(
      `Servico '${servicoId}' com status '${statusAtual}' nao permite operacao '${operacao}'`,
    );
  }
}
