import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { DOMAIN_EVENT_PUBLISHER } from './application/domain-event-publisher';
import { EventEmitterDomainEventPublisher } from './infrastructure/event-emitter-domain-event-publisher';
import { DomainExceptionFilter } from './infrastructure/domain-exception.filter';

/**
 * Modulo transversal (Global) que provê os artefatos de Clean Architecture
 * compartilhados por todos os bounded contexts:
 *
 * - `DOMAIN_EVENT_PUBLISHER`: porta de publicacao de eventos de dominio,
 *   implementada pelo adapter sobre o EventEmitter2.
 * - `DomainExceptionFilter`: registrado como APP_FILTER para que a traducao
 *   dominio -> HTTP valha em runtime E nos testes e2e (DI-based).
 */
@Global()
@Module({
  providers: [
    EventEmitterDomainEventPublisher,
    {
      provide: DOMAIN_EVENT_PUBLISHER,
      useExisting: EventEmitterDomainEventPublisher,
    },
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
  ],
  exports: [DOMAIN_EVENT_PUBLISHER],
})
export class SharedModule {}
