/**
 * Save Request Command
 * 
 * Command for saving HTTP requests to a collection.
 */

import { ICommand } from '../../interfaces/icommand.interface';
import { IEventBus } from '../../interfaces/ievent-bus.interface';
import { IRequestOrchestrator } from '../../interfaces/irequest-orchestrator.interface';

/**
 * Input DTO for saving a request
 */
export interface SaveRequestInput {
  name: string;
  method: string;
  url: string;
  body?: string;
  headers?: Record<string, string>;
  collectionId?: string;
  folderId?: string;
  auth?: any;
}

/**
 * Output DTO for save request operation
 */
export class SaveRequestOutput {
  readonly id: string;
  readonly name: string;
  readonly success: boolean;
  readonly savedAt: number;

  constructor(data: any) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.success = data.success || false;
    this.savedAt = data.savedAt || Date.now();
  }

  static from(data: any): SaveRequestOutput {
    return new SaveRequestOutput(data);
  }
}

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

/**
 * Command to save a request
 */
export class SaveRequestCommand implements ICommand<SaveRequestInput, SaveRequestOutput> {
  constructor(
    private orchestrator: IRequestOrchestrator,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {}

  /**
   * Validate save request input
   */
  validateInput(input: SaveRequestInput): void {
    if (!input || typeof input !== 'object') {
      throw new Error('SaveRequestCommand: Input must be a valid object');
    }

    if (!input.name || typeof input.name !== 'string') {
      throw new Error('SaveRequestCommand: Request name is required');
    }

    if (!input.method || typeof input.method !== 'string') {
      throw new Error('SaveRequestCommand: HTTP method is required');
    }

    if (!input.url || typeof input.url !== 'string') {
      throw new Error('SaveRequestCommand: URL is required');
    }
  }

  /**
   * Execute the save request command
   */
  async execute(input: SaveRequestInput): Promise<SaveRequestOutput> {
    this.validateInput(input);
    this.logger.debug('[SaveRequestCommand] Saving request', {
      name: input.name,
      method: input.method
    });

    try {
      const result = await this.orchestrator.saveRequest(input);

      this.eventBus.publish({
        type: 'RequestSaved',
        data: {
          requestId: result.id,
          name: result.name
        }
      });

      return SaveRequestOutput.from(result);
    } catch (error) {
      this.logger.error('[SaveRequestCommand] Failed to save request', error);
      throw error;
    }
  }
}
