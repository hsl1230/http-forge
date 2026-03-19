/**
 * Manage History Command
 * 
 * Command for using request history entries.
 */

import { UseHistoryEntryInput, UseHistoryEntryOutput } from '../../dto/history.dto';
import { ICommand } from '../../interfaces/icommand.interface';
import { IEventBus } from '../../interfaces/ievent-bus.interface';
import { IRequestOrchestrator } from '../../interfaces/irequest-orchestrator.interface';

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

/**
 * Command to use a history entry
 */
export class ManageHistoryCommand implements ICommand<UseHistoryEntryInput, UseHistoryEntryOutput> {
  constructor(
    private orchestrator: IRequestOrchestrator,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {}

  /**
   * Validate history entry selection input
   */
  validateInput(input: UseHistoryEntryInput): void {
    if (!input || typeof input !== 'object') {
      throw new Error('ManageHistoryCommand: Input must be a valid object');
    }

    if (!input.id || typeof input.id !== 'string') {
      throw new Error('ManageHistoryCommand: History entry ID is required');
    }
  }

  /**
   * Execute the manage history command
   */
  async execute(input: UseHistoryEntryInput): Promise<UseHistoryEntryOutput> {
    this.validateInput(input);
    this.logger.debug('[ManageHistoryCommand] Loading history entry', {
      id: input.id
    });

    try {
      const result = await this.orchestrator.useHistoryEntry(input);

      this.eventBus.publish({
        type: 'HistoryEntryUsed',
        data: {
          id: result.id,
          timestamp: result.timestamp
        }
      });

      return UseHistoryEntryOutput.from(result);
    } catch (error) {
      this.logger.error('[ManageHistoryCommand] Failed to load history entry', error);
      throw error;
    }
  }
}
