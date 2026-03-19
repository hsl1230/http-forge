/**
 * Request Orchestrator Interface
 * 
 * Defines the contract for request-related business logic operations.
 */

import { ExecuteRequestInput } from '../dto/request.dto';

/**
 * Interface for request orchestration operations
 */
export interface IRequestOrchestrator {
  /**
   * Execute an HTTP request
   * 
   * @param input Request execution input
   * @returns Promise with execution results
   */
  executeRequest(input: ExecuteRequestInput): Promise<any>;

  /**
   * Save a request
   * 
   * @param input Request save input
   * @returns Promise with save results
   */
  saveRequest(input: any): Promise<any>;

  /**
   * Manage cookies
   * 
   * @param input Cookie management input
   * @returns Promise with updated cookies
   */
  manageCookies(input: any): Promise<any>;

  /**
   * Use a history entry
   * 
   * @param input History entry input
   * @returns Promise with loaded request
   */
  useHistoryEntry(input: any): Promise<any>;

  /**
   * Manage variables
   * 
   * @param input Variable management input
   * @returns Promise with updated variables
   */
  manageVariables(input: any): Promise<any>;
}
