import { SagaOS } from './saga-os.entity';

/**
 * Porta de persistencia da saga. `save` grava a saga E os comandos pendentes
 * (outbox) na mesma transacao (ADR-0009), com lock otimista por `version`.
 */
export interface SagaRepository {
  findByNumero(numero: string): Promise<SagaOS | null>;
  save(saga: SagaOS): Promise<SagaOS>;
  /** Sagas EM_ANDAMENTO cujo prazo de aprovacao ou pagamento ja venceu. */
  findComPrazoVencido(agora: Date, limite?: number): Promise<SagaOS[]>;
  countPorStatus(): Promise<Record<string, number>>;
}
export const SAGA_REPOSITORY = Symbol('SAGA_REPOSITORY');
