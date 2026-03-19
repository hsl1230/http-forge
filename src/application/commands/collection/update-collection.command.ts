/**
 * Update Collection Command
 * 
 * Command for updating an existing collection.
 */

import { UpdateCollectionInput, UpdateCollectionOutput } from '../../dto/collection.dto';
import { ICollectionOrchestrator } from '../../interfaces/icollection-orchestrator.interface';
import { ICommand } from '../../interfaces/icommand.interface';
import { IEventBus } from '../../interfaces/ievent-bus.interface';

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

/**
 * Command to update a collection
 */
export class UpdateCollectionCommand implements ICommand<UpdateCollectionInput, UpdateCollectionOutput> {
  constructor(
    private orchestrator: ICollectionOrchestrator,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {}

  /**
   * Validate collection update input
   */
  validateInput(input: UpdateCollectionInput): void {
    if (!input || typeof input !== 'object') {
      throw new Error('UpdateCollectionCommand: Input must be a valid object');
    }

    if (!input.id || typeof input.id !== 'string') {
      throw new Error('UpdateCollectionCommand: Collection ID is required');
    }
  }

  /**
   * Execute the update collection command
   */
  async execute(input: UpdateCollectionInput): Promise<UpdateCollectionOutput> {
    this.validateInput(input);
    this.logger.debug('[UpdateCollectionCommand] Updating collection', {
      id: input.id,
      name: input.name
    });

    try {
      const result = await this.orchestrator.updateCollection(input);

      this.eventBus.publish({
        type: 'CollectionUpdated',
        data: {
          id: result.id,
          name: result.name,
          updated: result.updated
        }
      });

      return UpdateCollectionOutput.from(result);
    } catch (error) {
      this.logger.error('[UpdateCollectionCommand] Failed to update collection', error);
      throw error;
    }
  }
}
