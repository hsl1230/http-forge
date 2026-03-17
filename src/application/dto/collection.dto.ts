/**
 * Collection Management DTOs
 * 
 * Data transfer objects for managing collections in the application layer.
 * Handles collection save, update, and retrieval operations.
 */

// ============= SAVE COLLECTION =============

/**
 * Input DTO for saving a collection
 */
export interface SaveCollectionInput {
  /**
   * Collection name
   */
  name: string;

  /**
   * Collection description
   */
  description?: string;

  /**
   * Collection items (folders, requests)
   */
  items?: any[];

  /**
   * Collection variables
   */
  variables?: any[];

  /**
   * Collection authentication
   */
  auth?: any;
}

/**
 * Output DTO for collection save operation
 */
export class SaveCollectionOutput {
  /**
   * Collection identifier
   */
  readonly id: string;

  /**
   * Collection name
   */
  readonly name: string;

  /**
   * Whether save was successful
   */
  readonly success: boolean;

  /**
   * Item count in collection
   */
  readonly itemCount: number;

  /**
   * Save timestamp
   */
  readonly savedAt: number;

  /**
   * Collection path
   */
  readonly path?: string;

  constructor(data: any) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.success = data.success || false;
    this.itemCount = data.itemCount || 0;
    this.savedAt = data.savedAt || Date.now();
    this.path = data.path;
  }

  /**
   * Factory method to create SaveCollectionOutput from raw data
   * @param data Raw save result
   * @returns SaveCollectionOutput instance
   */
  static from(data: any): SaveCollectionOutput {
    return new SaveCollectionOutput(data);
  }
}

// ============= UPDATE COLLECTION =============

/**
 * Input DTO for updating a collection
 */
export interface UpdateCollectionInput {
  /**
   * Collection identifier
   */
  id: string;

  /**
   * Updated collection name
   */
  name?: string;

  /**
   * Updated description
   */
  description?: string;

  /**
   * Updated items
   */
  items?: any[];

  /**
   * Updated variables
   */
  variables?: any[];

  /**
   * Updated authentication
   */
  auth?: any;
}

/**
 * Output DTO for collection update operation
 */
export class UpdateCollectionOutput {
  /**
   * Collection identifier
   */
  readonly id: string;

  /**
   * Collection name
   */
  readonly name: string;

  /**
   * Whether update was successful
   */
  readonly success: boolean;

  /**
   * List of fields updated
   */
  readonly updated: string[];

  /**
   * Update timestamp
   */
  readonly updatedAt: number;

  /**
   * Changed item count
   */
  readonly changedItems?: number;

  constructor(data: any) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.success = data.success || false;
    this.updated = data.updated || [];
    this.updatedAt = data.updatedAt || Date.now();
    this.changedItems = data.changedItems;
  }

  /**
   * Factory method to create UpdateCollectionOutput from raw data
   * @param data Raw update result
   * @returns UpdateCollectionOutput instance
   */
  static from(data: any): UpdateCollectionOutput {
    return new UpdateCollectionOutput(data);
  }
}
