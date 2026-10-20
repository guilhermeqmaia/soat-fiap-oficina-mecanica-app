/**
 * Unit of work (ADR-0009): OS, saga e outbox vivem no MESMO Postgres, entao
 * uma mudanca de passo da saga, a transicao da OS e os comandos/eventos a
 * publicar sao gravados numa unica transacao — ou tudo, ou nada. O `tx` e
 * opaco para a aplicacao; os adapters Prisma sabem usa-lo.
 */
export interface UnitOfWork {
  executar<T>(fn: (tx: unknown) => Promise<T>): Promise<T>;
}
export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');
