/**
 * Request Execution DTOs
 * 
 * Data transfer objects for handling HTTP request execution in the application layer.
 * Follows DDD pattern with Input interfaces and Output classes.
 */

/**
 * Input DTO for executing an HTTP request
 * Transfers request data from presentation layer to orchestration layer
 */
export interface ExecuteRequestInput {
  request: any;
  environment?: any;
  authentication?: any;
  cookies?: any;
  variables?: any;
  collection?: any;
}

/**
 * Output DTO for request execution results
 * Contains the HTTP response and execution metadata
 */
export class ExecuteRequestOutput {
  /**
   * HTTP status code of the response
   */
  readonly statusCode: number;

  /**
   * Response headers as key-value pairs
   */
  readonly headers: Record<string, string>;

  /**
   * Response body content
   */
  readonly body: string;

  /**
   * Request execution duration in milliseconds
   */
  readonly duration: number;

  /**
   * Script execution results if applicable
   */
  readonly scriptResults?: any;

  /**
   * Cookies set by the response
   */
  readonly cookies?: Record<string, string>;

  constructor(data: any) {
    this.statusCode = data.statusCode || 0;
    this.headers = data.headers || {};
    this.body = data.body || '';
    this.duration = data.duration || 0;
    this.scriptResults = data.scriptResults;
    this.cookies = data.cookies;
  }

  /**
   * Factory method to create ExecuteRequestOutput from raw data
   * @param data Raw execution result data
   * @returns ExecuteRequestOutput instance
   */
  static from(data: any): ExecuteRequestOutput {
    return new ExecuteRequestOutput(data);
  }
}
