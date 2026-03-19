/**
 * Event Bus Implementation
 * 
 * Pub/Sub event bus for domain event distribution.
 * Commands publish events, orchestrators and handlers subscribe to them.
 */

import { IDomainEvent } from './domain-event';

/**
 * Event bus interface for publishing and subscribing to domain events
 */
export interface IEventBus {
  /**
   * Publish a domain event to all subscribers
   */
  publish(event: IDomainEvent): void;

  /**
   * Subscribe to events of a specific type
   */
  subscribe(eventType: string, handler: (event: IDomainEvent) => void): void;

  /**
   * Unsubscribe from events
   */
  unsubscribe(eventType: string, handler: (event: IDomainEvent) => void): void;
}

/**
 * Concrete event bus implementation
 */
export class EventBus implements IEventBus {
  private handlers: Map<string, Set<(event: IDomainEvent) => void>> = new Map();

  /**
   * Publish event to all subscribers
   */
  publish(event: IDomainEvent): void {
    const eventHandlers = this.handlers.get(event.type);
    if (eventHandlers) {
      eventHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error handling event ${event.type}:`, error);
        }
      });
    }
  }

  /**
   * Subscribe to events of a specific type
   */
  subscribe(eventType: string, handler: (event: IDomainEvent) => void): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(eventType: string, handler: (event: IDomainEvent) => void): void {
    const eventHandlers = this.handlers.get(eventType);
    if (eventHandlers) {
      eventHandlers.delete(handler);
      if (eventHandlers.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
  }
}
