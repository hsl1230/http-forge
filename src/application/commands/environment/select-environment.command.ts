/**
 * Select Environment Command
 * 
 * Command for selecting and loading an environment.
 */

import { SelectEnvironmentInput, SelectEnvironmentOutput } from '../../dto/environment.dto';
import { ICommand } from '../../interfaces/icommand.interface';
import { IEnvironmentOrchestrator } from '../../interfaces/ienvironment-orchestrator.interface';
import { IEventBus } from '../../interfaces/ievent-bus.interface';

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

/**
 * Command to select an environment
 */
export class SelectEnvironmentCommand implements ICommand<SelectEnvironmentInput, SelectEnvironmentOutput> {
  constructor(
    private orchestrator: IEnvironmentOrchestrator,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {}

  /**
   * Validate environment selection input
   */
  validateInput(input: SelectEnvironmentInput): void {
    if (!input || typeof input !== 'object') {
      throw new Error('SelectEnvironmentCommand: Input must be a valid object');
    }

    if (!input.id && !input.name) {
      throw new Error('SelectEnvironmentCommand: Either environment ID or name is required');
    }
  }

  /**
   * Execute the select environment command
   */
  async execute(input: SelectEnvironmentInput): Promise<SelectEnvironmentOutput> {
    this.validateInput(input);
    this.logger.debug('[SelectEnvironmentCommand] Selecting environment', {
      id: input.id,
      name: input.name
    });

    try {
      const result = await this.orchestrator.selectEnvironment(input);

      this.eventBus.publish({
        type: 'EnvironmentSelected',
        data: {
          id: result.id,
          name: result.name
        }
      });

      return SelectEnvironmentOutput.from(result);
    } catch (error) {
      this.logger.error('[SelectEnvironmentCommand] Failed to select environment', error);
      throw error;
    }
  }
}
