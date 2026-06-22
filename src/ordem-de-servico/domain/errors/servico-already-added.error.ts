import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class ServicoAlreadyAddedError extends DomainError {
  readonly kind = DomainErrorKind.CONFLICT;

  constructor(servicoId: string) {
    super(`Servico '${servicoId}' ja foi adicionado a esta Ordem de Servico`);
  }
}
