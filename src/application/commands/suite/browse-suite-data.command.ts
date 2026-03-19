/**
 * Browse Suite Data Command
 * 
 * Command for browsing test data from a test suite.
 */

import { BrowseDataInput, BrowseDataOutput } from '../../dto/test-suite.dto';
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
 * Command to browse suite test data
 */
export class BrowseSuiteDataCommand implements ICommand<BrowseDataInput, BrowseDataOutput> {
  constructor(
    private orchestrator: ITestSuiteOrchestrator,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {}

  /**
   * Validate browse data input
   */
  validateInput(input: BrowseDataInput): void {
    if (!input || typeof input !== 'object') {
      throw new Error('BrowseSuiteDataCommand: Input must be a valid object');
    }

    if (!input.id || typeof input.id !== 'string') {
      throw new Error('BrowseSuiteDataCommand: Suite ID is required');
    }
  }

  /**
   * Execute the browse suite data command
   */
  async execute(input: BrowseDataInput): Promise<BrowseDataOutput> {
    this.validateInput(input);
    this.logger.debug('[BrowseSuiteDataCommand] Browsing suite data', {
      id: input.id,
      offset: input.offset || 0,
      limit: input.limit || 50
    });

    try {
      const result = await this.orchestrator.browseSuiteData(input);

      this.eventBus.publish({
        type: 'SuiteDataBrowsed',
        data: {
          id: input.id,
          count: result.count,
          total: result.total
        }
      });

      return BrowseDataOutput.from(result);
    } catch (error) {
      this.logger.error('[BrowseSuiteDataCommand] Failed to browse suite data', error);
      throw error;
    }
  }
}
