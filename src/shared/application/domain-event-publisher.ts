import { DomainEvent } from '../domain/domain-event';

/**
 * Porta de saida para publicacao de eventos de dominio.
 *
 * Os use cases dependem apenas desta interface; o adapter concreto
 * (`EventEmitterDomainEventPublisher`) encapsula o `EventEmitter2` do NestJS.
 * Assim a camada de aplicacao deixa de depender do framework de eventos.
 */
export interface DomainEventPublisher {
  publish(event: DomainEvent): void;
}

export const DOMAIN_EVENT_PUBLISHER = Symbol('DomainEventPublisher');
