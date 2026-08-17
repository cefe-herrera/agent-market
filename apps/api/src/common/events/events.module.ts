import { Module } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { DomainEvent } from '@bnb-marketplace/shared-types';
import { DOMAIN_EVENT_EMITTER, DomainEventEmitter } from './domain-event.emitter';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    {
      provide: DOMAIN_EVENT_EMITTER,
      useFactory: (eventEmitter: EventEmitter2) =>
        new DomainEventEmitter((event: DomainEvent) => {
          eventEmitter.emit(event.type, event);
        }),
      inject: [EventEmitter2],
    },
  ],
  exports: [DOMAIN_EVENT_EMITTER, EventEmitterModule],
})
export class EventsModule {}
