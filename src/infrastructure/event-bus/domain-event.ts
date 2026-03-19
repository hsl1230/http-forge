/**
 * Domain Event Interface & Implementation
 * 
 * Represents domain events published throughout the application.
 * Used by event bus for pub/sub pattern across orchestration layer.
 */

/**
 * Domain event interface
 */
export interface IDomainEvent {
  type: string;
  data: any;
  timestamp: number;
}

/**
 * Concrete domain event implementation
 */
export class DomainEvent implements IDomainEvent {
  readonly type: string;
  readonly data: any;
  readonly timestamp: number;

  constructor(type: string, data?: any) {
    this.type = type;
    this.data = data;
    this.timestamp = Date.now();
  }

  /**
   * Helper to create event with typed data
   */
  static create<T>(type: string, data: T): DomainEvent {
    return new DomainEvent(type, data);
  }
}
