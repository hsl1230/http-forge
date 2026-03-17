/**
 * History Entry DTOs
 * 
 * Data transfer objects for managing request history in the application layer.
 * Allows selecting and loading previous requests from execution history.
 */

/**
 * Input DTO for selecting a history entry
 * Transfers history selection data from presentation layer
 */
export interface UseHistoryEntryInput {
  /**
   * Unique identifier of the history entry
   */
  id: string;

  /**
   * Optional filter for history queries
   */
  filter?: any;
}

/**
 * Output DTO for history entry retrieval
 * Contains the loaded request data and metadata
 */
export class UseHistoryEntryOutput {
  /**
   * Unique identifier of the history entry
   */
  readonly id: string;

  /**
   * The request data from history
   */
  readonly request: any;

  /**
   * The response data if available
   */
  readonly response?: any;

  /**
   * Timestamp when the request was executed
   */
  readonly timestamp: number;

  /**
   * Duration of the original request execution
   */
  readonly duration?: number;

  /**
   * Status code of the original response
   */
  readonly statusCode?: number;

  constructor(data: any) {
    this.id = data.id || '';
    this.request = data.request || {};
    this.response = data.response;
    this.timestamp = data.timestamp || Date.now();
    this.duration = data.duration;
    this.statusCode = data.statusCode;
  }

  /**
   * Factory method to create UseHistoryEntryOutput from raw data
   * @param data Raw history entry data
   * @returns UseHistoryEntryOutput instance
   */
  static from(data: any): UseHistoryEntryOutput {
    return new UseHistoryEntryOutput(data);
  }
}
