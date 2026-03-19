/**
 * Save Test Suite Command
 * 
 * Command for saving a test suite configuration.
 */

import { SaveSuiteInput, SaveSuiteOutput } from '../../dto/test-suite.dto';
import { ICommand } from '../../interfaces/icommand.interface';
import { IEventBus } from '../../interfaces/ievent-bus.interface';
import { ITestSuiteOrchestrator } from '../../interfaces/itest-suite-orchestrator.interface';

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

/**
 * Command to save a test suite
 */
export class SaveTestSuiteCommand implements ICommand<SaveSuiteInput, SaveSuiteOutput> {
  constructor(
    private orchestrator: ITestSuiteOrchestrator,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {}

  /**
   * Validate suite save input
   */
  validateInput(input: SaveSuiteInput): void {
    if (!input || typeof input !== 'object') {
      throw new Error('SaveTestSuiteCommand: Input must be a valid object');
    }

    if (!input.name || typeof input.name !== 'string') {
      throw new Error('SaveTestSuiteCommand: Suite name is required');
    }
  }

  /**
   * Execute the save test suite command
   */
  async execute(input: SaveSuiteInput): Promise<SaveSuiteOutput> {
    this.validateInput(input);
    this.logger.debug('[SaveTestSuiteCommand] Saving test suite', {
      name: input.name,
      requestCount: input.requests?.length || 0
    });

    try {
      const result = await this.orchestrator.saveSuite(input);

      this.eventBus.publish({
        type: 'SuiteSaved',
        data: {
          id: result.id,
          name: result.name,
          requestCount: result.requestCount
        }
      });

      return SaveSuiteOutput.from(result);
    } catch (error) {
      this.logger.error('[SaveTestSuiteCommand] Failed to save test suite', error);
      throw error;
    }
  }
}
