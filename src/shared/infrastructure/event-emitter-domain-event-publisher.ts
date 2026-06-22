import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from '../domain/domain-event';
import { DomainEventPublisher } from '../application/domain-event-publisher';

/**
 * Adapter de infraestrutura que implementa `DomainEventPublisher` sobre o
 * `EventEmitter2` do NestJS. E o unico ponto do codigo de aplicacao->framework
 * de eventos: os listeners continuam reagindo via `@OnEvent(event.eventName)`.
 */
@Injectable()
export class EventEmitterDomainEventPublisher implements DomainEventPublisher {
  constructor(private readonly emitter: EventEmitter2) {}

  publish(event: DomainEvent): void {
    this.emitter.emit(event.eventName, event);
  }
}
