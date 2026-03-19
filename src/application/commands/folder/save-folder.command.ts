/**
 * Save Folder Command
 */

import { SaveFolderInput, SaveFolderOutput } from '../../dto/folder.dto';
import { ICommand } from '../../interfaces/icommand.interface';
import { IEventBus } from '../../interfaces/ievent-bus.interface';
import { IFolderOrchestrator } from '../../interfaces/ifolder-orchestrator.interface';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class SaveFolderCommand implements ICommand<SaveFolderInput, SaveFolderOutput> {
  constructor(
    private orchestrator: IFolderOrchestrator,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {}

  validateInput(input: SaveFolderInput): void {
    if (!input || typeof input !== 'object') {
      throw new Error('SaveFolderCommand: Input must be a valid object');
    }

    if (!input.name || typeof input.name !== 'string') {
      throw new Error('SaveFolderCommand: Folder name is required');
    }
  }

  async execute(input: SaveFolderInput): Promise<SaveFolderOutput> {
    this.validateInput(input);
    this.logger.debug('[SaveFolderCommand] Saving folder', { name: input.name });

    try {
      const result = await this.orchestrator.saveFolder(input);

      this.eventBus.publish({
        type: 'FolderSaved',
        data: { id: result.id, name: result.name, path: result.path }
      });

      return SaveFolderOutput.from(result);
    } catch (error) {
      this.logger.error('[SaveFolderCommand] Failed to save folder', error);
      throw error;
    }
  }
}
