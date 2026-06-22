import { DomainError, DomainErrorKind } from '../../../shared/domain/domain-error';
export class OsNotOwnedByClienteError extends DomainError {
  readonly kind = DomainErrorKind.FORBIDDEN;

  constructor(ordemId: string) {
    super(
      `Ordem de Servico '${ordemId}' nao pertence ao cliente autenticado`,
    );
  }
}
