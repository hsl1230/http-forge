/**
 * Folder Orchestrator
 * 
 * Orchestrates folder management operations.
 */

import { SaveFolderInput, SaveFolderOutput } from '../../application/dto/folder.dto';
import { IFolderOrchestrator } from '../../application/interfaces/ifolder-orchestrator.interface';

/**
 * Folder orchestrator implementation
 */
export class FolderOrchestrator implements IFolderOrchestrator {
  constructor(private readonly logger: any) {}

  /**
   * Save folder
   */
  async saveFolder(input: SaveFolderInput): Promise<SaveFolderOutput> {
    this.logger.debug(`[FolderOrchestrator] Saving folder: ${input.name}`);

    try {
      const id = `fold-${Date.now()}`;

      return new SaveFolderOutput({
        id,
        name: input.name,
        parentId: input.parentId,
        collectionId: input.collectionId,
        success: true,
        path: `/${input.name}`,
        createdAt: Date.now(),
        itemCount: 0
      });
    } catch (error) {
      this.logger.error('[FolderOrchestrator] Save folder failed:', error);
      throw error;
    }
  }
}
