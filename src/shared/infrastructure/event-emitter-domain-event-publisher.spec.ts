import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from '../domain/domain-event';
import { EventEmitterDomainEventPublisher } from './event-emitter-domain-event-publisher';

describe('EventEmitterDomainEventPublisher', () => {
  it('emits the event under its eventName', () => {
    const emitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const publisher = new EventEmitterDomainEventPublisher(emitter);

    const event: DomainEvent = { eventName: 'algo.aconteceu' };
    publisher.publish(event);

    expect(emitter.emit).toHaveBeenCalledWith('algo.aconteceu', event);
  });
});
