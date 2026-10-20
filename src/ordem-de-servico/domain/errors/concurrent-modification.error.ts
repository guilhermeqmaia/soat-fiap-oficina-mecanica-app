import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';

/** A OS foi alterada por outra operacao entre a leitura e a gravacao (lock otimista). */
export class ConcurrentModificationError extends DomainError {
  readonly kind = DomainErrorKind.CONFLICT;

  constructor(id: string) {
    super(`Ordem de servico '${id}' foi alterada por outra operacao; releia e tente novamente`);
  }
}
