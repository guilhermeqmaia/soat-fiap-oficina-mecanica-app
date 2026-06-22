import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class OrdemDeServicoNotFoundError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;

  constructor(identifier: string) {
    super(`Ordem de Servico '${identifier}' nao encontrada`);
  }
}
