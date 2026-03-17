/**
 * Schema Management DTOs
 * 
 * Data transfer objects for managing GraphQL and OpenAPI schemas in the application layer.
 * Handles schema fetching, caching, and clearing operations.
 */

/**
 * Input DTO for schema management operations
 */
export interface ManageSchemaInput {
  /**
   * Operation type: 'fetch', 'cache', 'clear'
   */
  operation: 'fetch' | 'cache' | 'clear';

  /**
   * API endpoint URL
   */
  endpoint?: string;

  /**
   * Schema type: 'graphql', 'openapi'
   */
  schemaType?: 'graphql' | 'openapi';

  /**
   * Request headers for schema fetch
   */
  headers?: Record<string, string>;

  /**
   * Authentication information
   */
  auth?: any;

  /**
   * Optional introspection query
   */
  query?: string;
}

/**
 * Output DTO for schema management operations
 */
export class ManageSchemaOutput {
  /**
   * Whether operation was successful
   */
  readonly success: boolean;

  /**
   * Operation result message
   */
  readonly message: string;

  /**
   * Schema data (if fetched)
   */
  readonly schema?: any;

  /**
   * Schema cache key
   */
  readonly cacheKey?: string;

  /**
   * Whether result was from cache
   */
  readonly cached: boolean;

  /**
   * Fetch duration in milliseconds
   */
  readonly duration?: number;

  /**
   * Error details if operation failed
   */
  readonly error?: string;

  constructor(data: any) {
    this.success = data.success || false;
    this.message = data.message || '';
    this.schema = data.schema;
    this.cacheKey = data.cacheKey;
    this.cached = data.cached || false;
    this.duration = data.duration;
    this.error = data.error;
  }

  /**
   * Factory method to create ManageSchemaOutput from raw data
   * @param data Raw operation result
   * @returns ManageSchemaOutput instance
   */
  static from(data: any): ManageSchemaOutput {
    return new ManageSchemaOutput(data);
  }
}
