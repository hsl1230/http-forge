/**
 * Collection Orchestrator Interface
 * 
 * Defines the contract for collection-related business logic operations.
 */

import {
    SaveCollectionInput,
    UpdateCollectionInput
} from '../dto/collection.dto';

/**
 * Interface for collection orchestration operations
 */
export interface ICollectionOrchestrator {
  /**
   * Save a new collection
   */
  saveCollection(input: SaveCollectionInput): Promise<any>;

  /**
   * Update an existing collection
   */
  updateCollection(input: UpdateCollectionInput): Promise<any>;
}
