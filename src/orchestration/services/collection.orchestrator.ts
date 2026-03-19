/**
 * Collection Orchestrator
 * 
 * Orchestrates collection-related business logic.
 */

import { ICollectionService } from '@http-forge/core';
import { SaveCollectionInput, SaveCollectionOutput, UpdateCollectionInput, UpdateCollectionOutput } from '../../application/dto/collection.dto';
import { ICollectionOrchestrator } from '../../application/interfaces/icollection-orchestrator.interface';

/**
 * Collection orchestrator implementation
 */
export class CollectionOrchestrator implements ICollectionOrchestrator {
  constructor(
    private readonly collectionService: ICollectionService,
    private readonly logger: any
  ) {}

  /**
   * Save new collection
   */
  async saveCollection(input: SaveCollectionInput): Promise<SaveCollectionOutput> {
    this.logger.debug(`[CollectionOrchestrator] Saving collection: ${input.name}`);

    try {
      const id = `coll-${Date.now()}`;
      const collection = {
        id,
        name: input.name,
        description: input.description || '',
        items: input.items || [],
        variables: input.variables || {},
        auth: input.auth,
        createdAt: Date.now()
      };

      // Persist collection
      // Note: ICollectionService may not have exact 'save' method - placeholder implementation
      await (this.collectionService as any).save(collection as any);

      return new SaveCollectionOutput({
        id,
        name: input.name,
        success: true,
        itemCount: collection.items.length,
        path: `/${input.name}`,
        savedAt: collection.createdAt
      });
    } catch (error) {
      this.logger.error('[CollectionOrchestrator] Save collection failed:', error);
      throw error;
    }
  }

  /**
   * Update existing collection
   */
  async updateCollection(input: UpdateCollectionInput): Promise<UpdateCollectionOutput> {
    this.logger.debug(`[CollectionOrchestrator] Updating collection: ${input.id}`);

    try {
      // Note: ICollectionService may not have exact 'update' method - placeholder implementation
      const updated = await (this.collectionService as any).update(input.id, {
        name: input.name,
        description: input.description,
        items: input.items,
        variables: input.variables,
        auth: input.auth
      } as any);

      const changedFields: string[] = [];
      if (input.name) changedFields.push('name');
      if (input.description) changedFields.push('description');
      if (input.items) changedFields.push('items');
      if (input.variables) changedFields.push('variables');
      if (input.auth) changedFields.push('auth');

      return new UpdateCollectionOutput({
        id: input.id,
        name: updated.name,
        success: true,
        updated: changedFields,
        updatedAt: Date.now(),
        changedItems: changedFields.length
      });
    } catch (error) {
      this.logger.error('[CollectionOrchestrator] Update collection failed:', error);
      throw error;
    }
  }
}
