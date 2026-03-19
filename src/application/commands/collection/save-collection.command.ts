/**
 * Save Collection Command
 * 
 * Command for saving a new collection.
 */

import { SaveCollectionInput, SaveCollectionOutput } from '../../dto/collection.dto';
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
 * Command to save a collection
 */
export class SaveCollectionCommand implements ICommand<SaveCollectionInput, SaveCollectionOutput> {
  constructor(
    private orchestrator: ICollectionOrchestrator,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {}

  /**
   * Validate collection save input
   */
  validateInput(input: SaveCollectionInput): void {
    if (!input || typeof input !== 'object') {
      throw new Error('SaveCollectionCommand: Input must be a valid object');
    }

    if (!input.name || typeof input.name !== 'string') {
      throw new Error('SaveCollectionCommand: Collection name is required');
    }
  }

  /**
   * Execute the save collection command
   */
  async execute(input: SaveCollectionInput): Promise<SaveCollectionOutput> {
    this.validateInput(input);
    this.logger.debug('[SaveCollectionCommand] Saving collection', {
      name: input.name,
      itemCount: input.items?.length || 0
    });

    try {
      const result = await this.orchestrator.saveCollection(input);

      this.eventBus.publish({
        type: 'CollectionSaved',
        data: {
          id: result.id,
          name: result.name,
          itemCount: result.itemCount
        }
      });

      return SaveCollectionOutput.from(result);
    } catch (error) {
      this.logger.error('[SaveCollectionCommand] Failed to save collection', error);
      throw error;
    }
  }
}
