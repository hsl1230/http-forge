/**
 * Environment Orchestrator Interface
 * 
 * Defines the contract for environment-related business logic operations.
 */

import {
    AddEnvironmentInput,
    DeleteEnvironmentInput,
    DuplicateEnvironmentInput
} from '../dto/environment-crud.dto';
import { SelectEnvironmentInput } from '../dto/environment.dto';

/**
 * Interface for environment orchestration operations
 */
export interface IEnvironmentOrchestrator {
  /**
   * Select and activate an environment
   */
  selectEnvironment(input: SelectEnvironmentInput): Promise<any>;

  /**
   * Add a new environment
   */
  addEnvironment(input: AddEnvironmentInput): Promise<any>;

  /**
   * Delete an environment
   */
  deleteEnvironment(input: DeleteEnvironmentInput): Promise<any>;

  /**
   * Duplicate an environment
   */
  duplicateEnvironment(input: DuplicateEnvironmentInput): Promise<any>;

  /**
   * Manage environment configuration
   */
  manageConfig(input: any): Promise<any>;
}
