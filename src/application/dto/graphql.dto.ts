/**
 * GraphQL Management DTOs
 * 
 * Data transfer objects for managing GraphQL operations in the application layer.
 * Handles schema fetching, completion generation, and operation introspection.
 */

/**
 * Input DTO for GraphQL management operations
 */
export interface ManageGraphQLInput {
  /**
   * Operation type: 'fetchSchema', 'getCompletions', 'clearCache'
   */
  operation: 'fetchSchema' | 'getCompletions' | 'clearCache';

  /**
   * GraphQL endpoint URL
   */
  endpoint?: string;

  /**
   * Request headers for schema fetch
   */
  headers?: Record<string, string>;

  /**
   * Authentication information
   */
  auth?: any;

  /**
   * Editor content for completion requests
   */
  content?: string;

  /**
   * Cursor position for completion (line, character)
   */
  position?: {
    line: number;
    character: number;
  };

  /**
   * Introspection query override
   */
  query?: string;
}

/**
 * Output DTO for GraphQL management operations
 */
export class ManageGraphQLOutput {
  /**
   * Whether operation was successful
   */
  readonly success: boolean;

  /**
   * Result message
   */
  readonly message: string;

  /**
   * GraphQL schema data (for fetchSchema operation)
   */
  readonly schema?: any;

  /**
   * Completion items (for getCompletions operation)
   */
  readonly completions?: any[];

  /**
   * Cache key for schema
   */
  readonly cacheKey?: string;

  /**
   * Whether result was from cache
   */
  readonly cached: boolean;

  /**
   * Fetch/operation duration in milliseconds
   */
  readonly duration?: number;

  /**
   * Error details if operation failed
   */
  readonly error?: string;

  /**
   * Types extracted from schema
   */
  readonly types?: Array<{
    name: string;
    kind: string;
    description?: string;
  }>;

  constructor(data: any) {
    this.success = data.success || false;
    this.message = data.message || '';
    this.schema = data.schema;
    this.completions = data.completions;
    this.cacheKey = data.cacheKey;
    this.cached = data.cached || false;
    this.duration = data.duration;
    this.error = data.error;
    this.types = data.types;
  }

  /**
   * Get completion count
   * @returns Number of completions available
   */
  getCompletionCount(): number {
    return this.completions ? this.completions.length : 0;
  }

  /**
   * Get type count from schema
   * @returns Number of types in schema
   */
  getTypeCount(): number {
    return this.types ? this.types.length : 0;
  }

  /**
   * Factory method to create ManageGraphQLOutput from raw data
   * @param data Raw operation result
   * @returns ManageGraphQLOutput instance
   */
  static from(data: any): ManageGraphQLOutput {
    return new ManageGraphQLOutput(data);
  }
}
