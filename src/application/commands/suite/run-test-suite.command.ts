/**
 * Run Test Suite Command
 * 
 * Command for executing a test suite and collecting results.
 */

import { RunSuiteInput, RunSuiteOutput } from '../../dto/test-suite.dto';
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
 * Command to run a test suite
 */
export class RunTestSuiteCommand implements ICommand<RunSuiteInput, RunSuiteOutput> {
  constructor(
    private orchestrator: ITestSuiteOrchestrator,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {}

  /**
   * Validate suite run input
   */
  validateInput(input: RunSuiteInput): void {
    if (!input || typeof input !== 'object') {
      throw new Error('RunTestSuiteCommand: Input must be a valid object');
    }

    if (!input.id || typeof input.id !== 'string') {
      throw new Error('RunTestSuiteCommand: Suite ID is required');
    }
  }

  /**
   * Execute the run test suite command
   */
  async execute(input: RunSuiteInput): Promise<RunSuiteOutput> {
    this.validateInput(input);
    this.logger.debug('[RunTestSuiteCommand] Running test suite', {
      id: input.id
    });

    try {
      const result = await this.orchestrator.runSuite(input);

      this.eventBus.publish({
        type: 'SuiteRunCompleted',
        data: {
          executionId: result.executionId,
          totalTests: result.totalTests,
          passedTests: result.passedTests,
          failedTests: result.failedTests,
          duration: result.duration
        }
      });

      return RunSuiteOutput.from(result);
    } catch (error) {
      this.logger.error('[RunTestSuiteCommand] Test suite execution failed', error);
      throw error;
    }
  }
}
