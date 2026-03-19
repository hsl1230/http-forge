/**
 * Manage Variables Command
 * 
 * Command for managing request variables across different scopes.
 */

import { ManageVariableInput, ManageVariableOutput } from '../../dto/variable.dto';
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
 * Command to manage variables
 */
export class ManageVariablesCommand implements ICommand<ManageVariableInput, ManageVariableOutput> {
  constructor(
    private orchestrator: IRequestOrchestrator,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {}

  /**
   * Validate variable management input
   */
  validateInput(input: ManageVariableInput): void {
    if (!input || typeof input !== 'object') {
      throw new Error('ManageVariablesCommand: Input must be a valid object');
    }

    if (!input.operation || !['add', 'update', 'delete'].includes(input.operation)) {
      throw new Error('ManageVariablesCommand: Valid operation is required (add, update, delete)');
    }

    if (!input.scope || !['collection', 'environment', 'global'].includes(input.scope)) {
      throw new Error('ManageVariablesCommand: Valid scope is required (collection, environment, global)');
    }

    if (!input.name || typeof input.name !== 'string') {
      throw new Error('ManageVariablesCommand: Variable name is required');
    }
  }

  /**
   * Execute the manage variables command
   */
  async execute(input: ManageVariableInput): Promise<ManageVariableOutput> {
    this.validateInput(input);
    this.logger.debug('[ManageVariablesCommand] Managing variable', {
      operation: input.operation,
      scope: input.scope,
      name: input.name
    });

    try {
      const result = await this.orchestrator.manageVariables(input);

      this.eventBus.publish({
        type: 'VariableUpdated',
        data: {
          operation: input.operation,
          scope: input.scope,
          variableName: input.name
        }
      });

      return ManageVariableOutput.from(result);
    } catch (error) {
      this.logger.error('[ManageVariablesCommand] Failed to manage variable', error);
      throw error;
    }
  }
}
