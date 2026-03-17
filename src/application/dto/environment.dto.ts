/**
 * Environment Selection DTOs
 * 
 * Data transfer objects for selecting and loading environments in the application layer.
 * Manages active environment context and variable resolution.
 */

/**
 * Input DTO for environment selection
 * Transfers environment selection data from presentation layer
 */
export interface SelectEnvironmentInput {
  /**
   * Environment identifier (ID or name)
   */
  id?: string;

  /**
   * Environment name
   */
  name?: string;

  /**
   * Optional context data
   */
  context?: any;
}

/**
 * Output DTO for environment loading
 * Contains resolved environment variables and metadata
 */
export class SelectEnvironmentOutput {
  /**
   * Environment identifier
   */
  readonly id: string;

  /**
   * Environment name
   */
  readonly name: string;

  /**
   * Resolved environment variables
   */
  readonly variables: Record<string, any>;

  /**
   * Environment description
   */
  readonly description?: string;

  /**
   * Whether the environment is active
   */
  readonly isActive: boolean;

  /**
   * Creation timestamp
   */
  readonly createdAt?: number;

  /**
   * Last modification timestamp
   */
  readonly updatedAt?: number;

  constructor(data: any) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.variables = data.variables || {};
    this.description = data.description;
    this.isActive = data.isActive || false;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Factory method to create SelectEnvironmentOutput from raw data
   * @param data Raw environment data
   * @returns SelectEnvironmentOutput instance
   */
  static from(data: any): SelectEnvironmentOutput {
    return new SelectEnvironmentOutput(data);
  }
}
