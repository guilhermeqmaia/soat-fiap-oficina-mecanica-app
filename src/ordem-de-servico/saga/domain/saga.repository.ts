import { SagaOS } from './saga-os.entity';

/**
 * Porta de persistencia da saga. `save` grava a saga E os comandos pendentes
 * (outbox) na mesma transacao (ADR-0009), com lock otimista por `version`.
 * `tx` = unit of work do chamador (orquestrador): OS + saga + outbox juntos.
 */
export interface SagaRepository {
  findByNumero(numero: string, tx?: unknown): Promise<SagaOS | null>;
  save(saga: SagaOS, tx?: unknown): Promise<SagaOS>;
  deleteByNumero(numero: string, tx?: unknown): Promise<void>;
  /** Sagas EM_ANDAMENTO cujo prazo de aprovacao ou pagamento ja venceu. */
  findComPrazoVencido(agora: Date, limite?: number): Promise<SagaOS[]>;
  countPorStatus(): Promise<Record<string, number>>;
  /** Sagas EM_ANDAMENTO paradas no mesmo passo ha mais tempo que `desde`. */
  countParadasDesde(desde: Date): Promise<number>;
}
export const SAGA_REPOSITORY = Symbol('SAGA_REPOSITORY');
