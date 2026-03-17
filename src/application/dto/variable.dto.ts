/**
 * Variable Management DTOs
 * 
 * Data transfer objects for managing variables (scope: collection, environment, global) in the application layer.
 * Handles variable operations: add, update, delete, and retrieve.
 */

/**
 * Input DTO for variable management operations
 * Transfers variable data from presentation layer to orchestration layer
 */
export interface ManageVariableInput {
  /**
   * Operation type: 'add', 'update', 'delete'
   */
  operation: 'add' | 'update' | 'delete';

  /**
   * Variable scope: 'collection', 'environment', 'global'
   */
  scope: 'collection' | 'environment' | 'global';

  /**
   * Variable name
   */
  name: string;

  /**
   * Variable value
   */
  value?: string;

  /**
   * Scope identifier (collection ID, environment ID, etc)
   */
  scopeId?: string;

  /**
   * Whether variable is enabled
   */
  enabled?: boolean;
}

/**
 * Output DTO for variable management operations
 * Contains operation confirmation and variable information
 */
export class ManageVariableOutput {
  /**
   * Whether the operation was successful
   */
  readonly success: boolean;

  /**
   * Operation result message
   */
  readonly message: string;

  /**
   * Variable that was modified
   */
  readonly variable?: any;

  /**
   * Updated list of variables in the scope
   */
  readonly variables: any[];

  /**
   * Variable scope affected
   */
  readonly scope: string;

  constructor(data: any) {
    this.success = data.success || false;
    this.message = data.message || '';
    this.variable = data.variable;
    this.variables = data.variables || [];
    this.scope = data.scope || 'collection';
  }

  /**
   * Factory method to create ManageVariableOutput from raw data
   * @param data Raw operation result data
   * @returns ManageVariableOutput instance
   */
  static from(data: any): ManageVariableOutput {
    return new ManageVariableOutput(data);
  }
}
