/**
 * Export Suite Results Command
 * 
 * Command for exporting test suite results in various formats.
 */

import { ExportSuiteInput, ExportSuiteOutput } from '../../dto/test-suite.dto';
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
 * Command to export suite results
 */
export class ExportSuiteResultsCommand implements ICommand<ExportSuiteInput, ExportSuiteOutput> {
  constructor(
    private orchestrator: ITestSuiteOrchestrator,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {}

  /**
   * Validate export input
   */
  validateInput(input: ExportSuiteInput): void {
    if (!input || typeof input !== 'object') {
      throw new Error('ExportSuiteResultsCommand: Input must be a valid object');
    }

    if (!input.id || typeof input.id !== 'string') {
      throw new Error('ExportSuiteResultsCommand: Suite ID is required');
    }

    if (!input.format || !['json', 'postman', 'openapi'].includes(input.format)) {
      throw new Error('ExportSuiteResultsCommand: Valid format is required (json, postman, openapi)');
    }
  }

  /**
   * Execute the export suite results command
   */
  async execute(input: ExportSuiteInput): Promise<ExportSuiteOutput> {
    this.validateInput(input);
    this.logger.debug('[ExportSuiteResultsCommand] Exporting suite results', {
      id: input.id,
      format: input.format
    });

    try {
      const result = await this.orchestrator.exportResults(input);

      this.eventBus.publish({
        type: 'SuiteResultsExported',
        data: {
          id: input.id,
          format: input.format,
          size: result.size
        }
      });

      return ExportSuiteOutput.from(result);
    } catch (error) {
      this.logger.error('[ExportSuiteResultsCommand] Failed to export suite results', error);
      throw error;
    }
  }
}
