/**
 * Execute Request Command
 * 
 * Command for executing HTTP requests through the application layer.
 * Orchestrates request execution and publishes events.
 */

import { ExecuteRequestInput, ExecuteRequestOutput } from '../../dto/request.dto';
import { ICommand } from '../../interfaces/icommand.interface';
import { IEventBus } from '../../interfaces/ievent-bus.interface';
import { IRequestOrchestrator } from '../../interfaces/irequest-orchestrator.interface';

/**
 * Logger interface for dependency injection
 */
export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

/**
 * Command to execute an HTTP request
 * 
 * Validates input, delegates to orchestrator, publishes events
 */
export class ExecuteRequestCommand implements ICommand<ExecuteRequestInput, ExecuteRequestOutput> {
  constructor(
    private orchestrator: IRequestOrchestrator,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {}

  /**
   * Validate request input
   * 
   * @param input The request to validate
   * @throws Error if request is invalid
   */
  validateInput(input: ExecuteRequestInput): void {
    if (!input || typeof input !== 'object') {
      throw new Error('ExecuteRequestCommand: Input must be a valid object');
    }

    if (!input.request || typeof input.request !== 'object') {
      throw new Error('ExecuteRequestCommand: Request object is required');
    }
  }

  /**
   * Execute the request
   * 
   * @param input The request execution input
   * @returns Promise with execution output
   */
  async execute(input: ExecuteRequestInput): Promise<ExecuteRequestOutput> {
    this.validateInput(input);
    this.logger.debug('[ExecuteRequestCommand] Executing request', {
      method: input.request.method,
      url: input.request.url
    });

    try {
      const result = await this.orchestrator.executeRequest(input);
      
      this.eventBus.publish({
        type: 'RequestExecuted',
        data: {
          statusCode: result.statusCode,
          duration: result.duration
        }
      });

      return ExecuteRequestOutput.from(result);
    } catch (error) {
      this.logger.error('[ExecuteRequestCommand] Request execution failed', error);
      throw error;
    }
  }
}
