import { DomainError, DomainErrorKind } from '@guilhermeqmaia/oficina-kit/core';
export class InsufficientStockError extends DomainError {
  readonly kind = DomainErrorKind.CONFLICT;

  constructor(nome: string, requested: number, available: number) {
    super(`Estoque insuficiente para '${nome}': solicitado ${requested}, disponivel ${available}`);
  }
}
