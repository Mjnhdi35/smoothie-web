import type { DomainEvent } from './domain-event';

export type DomainEventHandler<TEvent extends DomainEvent = DomainEvent> = (
  event: TEvent,
) => Promise<void>;

export interface EventBus {
  publish<TPayload extends object>(event: DomainEvent<TPayload>): Promise<void>;
  subscribe(
    eventType: string,
    handler: DomainEventHandler,
  ): Promise<() => Promise<void>>;
}

export const EVENT_BUS = Symbol('EVENT_BUS');
