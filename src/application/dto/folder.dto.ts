/**
 * Folder Management DTOs
 * 
 * Data transfer objects for managing folders in the application layer.
 * Handles folder creation, update, and retrieval operations.
 */

/**
 * Input DTO for saving a folder
 */
export interface SaveFolderInput {
  /**
   * Folder name
   */
  name: string;

  /**
   * Parent folder identifier
   */
  parentId?: string;

  /**
   * Folder description
   */
  description?: string;

  /**
   * Collection identifier this folder belongs to
   */
  collectionId?: string;
}

/**
 * Output DTO for folder save operation
 */
export class SaveFolderOutput {
  /**
   * Folder identifier
   */
  readonly id: string;

  /**
   * Folder name
   */
  readonly name: string;

  /**
   * Parent folder identifier
   */
  readonly parentId?: string;

  /**
   * Collection identifier
   */
  readonly collectionId?: string;

  /**
   * Whether save was successful
   */
  readonly success: boolean;

  /**
   * Folder path
   */
  readonly path: string;

  /**
   * Creation timestamp
   */
  readonly createdAt: number;

  /**
   * Child item count
   */
  readonly itemCount: number;

  constructor(data: any) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.parentId = data.parentId;
    this.collectionId = data.collectionId;
    this.success = data.success || false;
    this.path = data.path || `/${this.name}`;
    this.createdAt = data.createdAt || Date.now();
    this.itemCount = data.itemCount || 0;
  }

  /**
   * Factory method to create SaveFolderOutput from raw data
   * @param data Raw save result
   * @returns SaveFolderOutput instance
   */
  static from(data: any): SaveFolderOutput {
    return new SaveFolderOutput(data);
  }
}
