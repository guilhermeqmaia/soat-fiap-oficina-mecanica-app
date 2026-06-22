import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class ServicoNotAddedError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;

  constructor(servicoId: string) {
    super(`Servico '${servicoId}' nao esta nesta Ordem de Servico`);
  }
}
