import { DomainEvent } from '@bnb-marketplace/shared-types';

export class DomainEventEmitter {
  constructor(private readonly emitFn: (event: DomainEvent) => void) {}

  emit<T>(type: string, payload: T): void {
    this.emitFn({ type, payload, occurredAt: new Date() });
  }
}

export const DOMAIN_EVENT_EMITTER = 'DOMAIN_EVENT_EMITTER';
