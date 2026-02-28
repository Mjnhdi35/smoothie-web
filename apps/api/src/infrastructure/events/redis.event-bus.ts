import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import {
  type DomainEventHandler,
  type EventBus,
} from '../../common/events/event-bus';
import type { DomainEvent } from '../../common/events/domain-event';
import { RedisPublisher } from './redis.publisher';
import { RedisSubscriber } from './redis.subscriber';

const EVENT_CHANNEL = 'internal:domain-events';

@Injectable()
export class RedisEventBus implements EventBus {
  private readonly handlers = new Map<string, Set<DomainEventHandler>>();
  private readonly logger = new Logger(RedisEventBus.name);
  private subscribed = false;

  constructor(
    private readonly publisher: RedisPublisher,
    private readonly subscriber: RedisSubscriber,
  ) {}

  async publish<TPayload extends object>(
    event: DomainEvent<TPayload>,
  ): Promise<void> {
    await this.publisher.publish(EVENT_CHANNEL, JSON.stringify(event));
  }

  async subscribe(
    eventType: string,
    handler: DomainEventHandler,
  ): Promise<() => Promise<void>> {
    await this.ensureSubscribed();

    let eventHandlers = this.handlers.get(eventType);
    if (eventHandlers === undefined) {
      eventHandlers = new Set<DomainEventHandler>();
      this.handlers.set(eventType, eventHandlers);
    }

    eventHandlers.add(handler);

    return () => {
      const existing = this.handlers.get(eventType);

      if (existing === undefined) {
        return Promise.resolve();
      }

      existing.delete(handler);

      if (existing.size === 0) {
        this.handlers.delete(eventType);
      }

      return Promise.resolve();
    };
  }

  private async ensureSubscribed(): Promise<void> {
    if (this.subscribed) {
      return;
    }

    await this.subscriber.subscribe(EVENT_CHANNEL, async (message) => {
      let event: DomainEvent;

      try {
        event = JSON.parse(message) as DomainEvent;
      } catch {
        this.logger.warn('Skip malformed domain event payload');
        return;
      }

      const handlers = this.handlers.get(event.type);

      if (handlers === undefined || handlers.size === 0) {
        return;
      }

      const clonedHandlers = Array.from(handlers);
      const results = await Promise.allSettled(
        clonedHandlers.map(async (handler) => handler(event)),
      );

      for (const result of results) {
        if (result.status === 'rejected') {
          const detail = this.formatUnknown(result.reason as unknown);
          this.logger.warn(
            `Domain event handler failed for ${event.type}: ${detail}`,
          );
        }
      }
    });

    this.subscribed = true;
  }

  private formatUnknown(value: unknown): string {
    return value instanceof Error ? value.message : String(value);
  }
}
