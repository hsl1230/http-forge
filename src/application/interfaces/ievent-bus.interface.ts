/**
 * Event Bus Interface
 * 
 * Defines the contract for event publishing and subscription in the application.
 */

/**
 * Domain event type
 */
export interface IDomainEvent {
  type: string;
  data?: any;
  timestamp?: number;
}

/**
 * Event bus for publishing domain events
 */
export interface IEventBus {
  /**
   * Publish an event to all subscribers
   * 
   * @param event The event to publish
   */
  publish(event: IDomainEvent): void;

  /**
   * Subscribe to events of a specific type
   * 
   * @param eventType The type of event to subscribe to
   * @param handler The handler function for this event type
   */
  subscribe(eventType: string, handler: (event: IDomainEvent) => void): void;

  /**
   * Unsubscribe from events
   * 
   * @param eventType The type of event to unsubscribe from
   * @param handler The handler to remove
   */
  unsubscribe(eventType: string, handler: (event: IDomainEvent) => void): void;
}
