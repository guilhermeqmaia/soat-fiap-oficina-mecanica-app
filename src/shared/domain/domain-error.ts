/**
 * Categoria semantica (HTTP-agnostica) de um erro de dominio.
 *
 * O dominio nunca conhece codigos HTTP. Ele apenas classifica a natureza do
 * erro; a traducao para status HTTP e responsabilidade do
 * `DomainExceptionFilter` na camada de interface/infra.
 */
export enum DomainErrorKind {
  /** Recurso nao encontrado. */
  NOT_FOUND = 'NOT_FOUND',
  /** Violacao de invariante de unicidade/estado conflitante. */
  CONFLICT = 'CONFLICT',
  /** Entrada invalida / regra de validacao violada. */
  INVALID_INPUT = 'INVALID_INPUT',
  /** Acesso negado (autenticado, mas sem permissao sobre o recurso). */
  FORBIDDEN = 'FORBIDDEN',
  /** Falha de autenticacao (credenciais invalidas). */
  UNAUTHORIZED = 'UNAUTHORIZED',
}

/**
 * Erro base de dominio. Toda regra de negocio violada deve lancar uma subclasse
 * deste tipo, declarando seu `kind`. Isso permite que um unico exception filter
 * global traduza erros de dominio em respostas HTTP, sem que controllers
 * precisem de blocos try/catch repetidos.
 */
export abstract class DomainError extends Error {
  abstract readonly kind: DomainErrorKind;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
