/**
 * Cookie Management DTOs
 * 
 * Data transfer objects for managing cookies in the application layer.
 * Handles cookie operations: add, update, delete, and retrieve.
 */

/**
 * Input DTO for cookie management operations
 * Transfers cookie data from presentation layer to orchestration layer
 */
export interface ManageCookieInput {
  /**
   * Operation type: 'add', 'update', 'delete', 'clear'
   */
  operation: 'add' | 'update' | 'delete' | 'clear';

  /**
   * Cookie domain
   */
  domain?: string;

  /**
   * Cookie name
   */
  name?: string;

  /**
   * Cookie value
   */
  value?: string;

  /**
   * Cookie expiration date
   */
  expires?: Date;

  /**
   * Cookie path
   */
  path?: string;

  /**
   * HTTP only flag
   */
  httpOnly?: boolean;

  /**
   * Secure flag
   */
  secure?: boolean;
}

/**
 * Output DTO for cookie management operations
 * Contains operation confirmation and updated cookie list
 */
export class ManageCookieOutput {
  /**
   * Whether the operation was successful
   */
  readonly success: boolean;

  /**
   * Operation result message
   */
  readonly message: string;

  /**
   * Updated list of cookies
   */
  readonly cookies: any[];

  /**
   * Count of total cookies
   */
  readonly count: number;

  constructor(data: any) {
    this.success = data.success || false;
    this.message = data.message || '';
    this.cookies = data.cookies || [];
    this.count = this.cookies.length;
  }

  /**
   * Factory method to create ManageCookieOutput from raw data
   * @param data Raw operation result data
   * @returns ManageCookieOutput instance
   */
  static from(data: any): ManageCookieOutput {
    return new ManageCookieOutput(data);
  }
}
