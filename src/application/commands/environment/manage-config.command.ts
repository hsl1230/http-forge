/**
 * Manage Config Command
 * 
 * Command for managing environment configuration files.
 */

import { ICommand } from '../../interfaces/icommand.interface';
import { IEnvironmentOrchestrator } from '../../interfaces/ienvironment-orchestrator.interface';
import { IEventBus } from '../../interfaces/ievent-bus.interface';

/**
 * Input DTO for config management
 */
export interface ManageConfigInput {
  operation: 'load' | 'save' | 'reset';
  filePath?: string;
  config?: any;
}

/**
 * Output DTO for config management
 */
export class ManageConfigOutput {
  readonly success: boolean;
  readonly message: string;
  readonly config?: any;

  constructor(data: any) {
    this.success = data.success || false;
    this.message = data.message || '';
    this.config = data.config;
  }

  static from(data: any): ManageConfigOutput {
    return new ManageConfigOutput(data);
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
 * Command to manage environment configuration
 */
export class ManageConfigCommand implements ICommand<ManageConfigInput, ManageConfigOutput> {
  constructor(
    private orchestrator: IEnvironmentOrchestrator,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {}

  /**
   * Validate config management input
   */
  validateInput(input: ManageConfigInput): void {
    if (!input || typeof input !== 'object') {
      throw new Error('ManageConfigCommand: Input must be a valid object');
    }

    if (!input.operation || !['load', 'save', 'reset'].includes(input.operation)) {
      throw new Error('ManageConfigCommand: Valid operation is required (load, save, reset)');
    }

    if (input.operation === 'save' && !input.config) {
      throw new Error('ManageConfigCommand: Config object is required for save operation');
    }
  }

  /**
   * Execute the manage config command
   */
  async execute(input: ManageConfigInput): Promise<ManageConfigOutput> {
    this.validateInput(input);
    this.logger.debug('[ManageConfigCommand] Managing configuration', {
      operation: input.operation
    });

    try {
      const result = await this.orchestrator.manageConfig(input);

      this.eventBus.publish({
        type: 'ConfigUpdated',
        data: {
          operation: input.operation
        }
      });

      return ManageConfigOutput.from(result);
    } catch (error) {
      this.logger.error('[ManageConfigCommand] Failed to manage config', error);
      throw error;
    }
  }
}
