/**
 * Environment CRUD DTOs
 * 
 * Data transfer objects for environment creation, reading, updating, and deletion operations.
 * Handles environment lifecycle management.
 */

// ============= CREATE ENVIRONMENT =============

/**
 * Input DTO for creating a new environment
 */
export interface AddEnvironmentInput {
  /**
   * Environment name
   */
  name: string;

  /**
   * Environment description
   */
  description?: string;

  /**
   * Initial variables
   */
  variables?: Record<string, any>;
}

/**
 * Output DTO for environment creation
 */
export class AddEnvironmentOutput {
  /**
   * Newly created environment identifier
   */
  readonly id: string;

  /**
   * Environment name
   */
  readonly name: string;

  /**
   * Environment description
   */
  readonly description?: string;

  /**
   * Creation timestamp
   */
  readonly createdAt: number;

  /**
   * Variables in the environment
   */
  readonly variables: Record<string, any>;

  constructor(data: any) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.description = data.description;
    this.createdAt = data.createdAt || Date.now();
    this.variables = data.variables || {};
  }

  /**
   * Factory method to create AddEnvironmentOutput from raw data
   * @param data Raw environment creation result
   * @returns AddEnvironmentOutput instance
   */
  static from(data: any): AddEnvironmentOutput {
    return new AddEnvironmentOutput(data);
  }
}

// ============= DELETE ENVIRONMENT =============

/**
 * Input DTO for deleting an environment
 */
export interface DeleteEnvironmentInput {
  /**
   * Environment identifier to delete
   */
  id: string;

  /**
   * Environment name (for confirmation)
   */
  name?: string;
}

/**
 * Output DTO for environment deletion
 */
export class DeleteEnvironmentOutput {
  /**
   * Identifier of deleted environment
   */
  readonly id: string;

  /**
   * Confirmation message
   */
  readonly message: string;

  /**
   * Whether deletion was successful
   */
  readonly success: boolean;

  constructor(data: any) {
    this.id = data.id || '';
    this.message = data.message || 'Environment deleted successfully';
    this.success = data.success || false;
  }

  /**
   * Factory method to create DeleteEnvironmentOutput from raw data
   * @param data Raw deletion result
   * @returns DeleteEnvironmentOutput instance
   */
  static from(data: any): DeleteEnvironmentOutput {
    return new DeleteEnvironmentOutput(data);
  }
}

// ============= DUPLICATE ENVIRONMENT =============

/**
 * Input DTO for duplicating an environment
 */
export interface DuplicateEnvironmentInput {
  /**
   * Source environment identifier
   */
  sourceId: string;

  /**
   * New environment name
   */
  newName: string;

  /**
   * Optional new description
   */
  newDescription?: string;
}

/**
 * Output DTO for environment duplication
 */
export class DuplicateEnvironmentOutput {
  /**
   * New environment identifier
   */
  readonly id: string;

  /**
   * New environment name
   */
  readonly name: string;

  /**
   * New environment description
   */
  readonly description?: string;

  /**
   * Duplicated variables
   */
  readonly variables: Record<string, any>;

  /**
   * Creation timestamp
   */
  readonly createdAt: number;

  /**
   * Source environment ID that was duplicated
   */
  readonly sourceId: string;

  constructor(data: any) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.description = data.description;
    this.variables = data.variables || {};
    this.createdAt = data.createdAt || Date.now();
    this.sourceId = data.sourceId || '';
  }

  /**
   * Factory method to create DuplicateEnvironmentOutput from raw data
   * @param data Raw duplication result
   * @returns DuplicateEnvironmentOutput instance
   */
  static from(data: any): DuplicateEnvironmentOutput {
    return new DuplicateEnvironmentOutput(data);
  }
}
