import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class ProdutoAlreadyAddedError extends DomainError {
  readonly kind = DomainErrorKind.CONFLICT;

  constructor(produtoId: string) {
    super(`Produto '${produtoId}' ja foi adicionado a esta Ordem de Servico`);
  }
}
