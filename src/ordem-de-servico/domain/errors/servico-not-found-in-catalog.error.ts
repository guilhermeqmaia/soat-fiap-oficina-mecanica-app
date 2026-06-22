import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class ServicoNotFoundInCatalogError extends DomainError {
  readonly kind = DomainErrorKind.NOT_FOUND;

  constructor(servicoId: string) {
    super(`Servico com id '${servicoId}' nao encontrado no catalogo`);
  }
}
