/**
 * Manage Environments Command
 * 
 * Command for managing environment lifecycle (create, delete, duplicate).
 */

import {
    AddEnvironmentInput,
    AddEnvironmentOutput,
    DeleteEnvironmentInput,
    DeleteEnvironmentOutput,
    DuplicateEnvironmentInput,
    DuplicateEnvironmentOutput
} from '../../dto/environment-crud.dto';
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
 * Union type for environment management inputs
 */
export type ManageEnvironmentInput = AddEnvironmentInput | DeleteEnvironmentInput | DuplicateEnvironmentInput;

/**
 * Union type for environment management outputs
 */
export type ManageEnvironmentOutput = AddEnvironmentOutput | DeleteEnvironmentOutput | DuplicateEnvironmentOutput;

/**
 * Command to manage environments (add, delete, duplicate)
 */
export class ManageEnvironmentsCommand implements ICommand<ManageEnvironmentInput, ManageEnvironmentOutput> {
  constructor(
    private orchestrator: IEnvironmentOrchestrator,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {}

  /**
   * Validate environment management input
   */
  validateInput(input: ManageEnvironmentInput): void {
    if (!input || typeof input !== 'object') {
      throw new Error('ManageEnvironmentsCommand: Input must be a valid object');
    }

    if ('name' in input && !input.name) {
      throw new Error('ManageEnvironmentsCommand: Environment name is required for add operation');
    }

    if ('id' in input && 'name' in input) {
      // DeleteEnvironmentInput
      if (!input.id) {
        throw new Error('ManageEnvironmentsCommand: Environment ID is required for delete operation');
      }
    }

    if ('sourceId' in input && 'newName' in input) {
      // DuplicateEnvironmentInput
      if (!input.sourceId) {
        throw new Error('ManageEnvironmentsCommand: Source environment ID is required for duplicate operation');
      }
      if (!input.newName) {
        throw new Error('ManageEnvironmentsCommand: New environment name is required for duplicate operation');
      }
    }
  }

  /**
   * Execute the manage environments command
   */
  async execute(input: ManageEnvironmentInput): Promise<ManageEnvironmentOutput> {
    this.validateInput(input);

    try {
      if ('sourceId' in input && 'newName' in input) {
        // Duplicate operation
        this.logger.debug('[ManageEnvironmentsCommand] Duplicating environment', {
          sourceId: input.sourceId,
          newName: input.newName
        });
        const result = await this.orchestrator.duplicateEnvironment(input as DuplicateEnvironmentInput);
        this.eventBus.publish({
          type: 'EnvironmentDuplicated',
          data: {
            sourceId: input.sourceId,
            newId: result.id,
            newName: result.name
          }
        });
        return DuplicateEnvironmentOutput.from(result);
      } else if ('id' in input && 'name' in input && typeof input.id === 'string') {
        // Delete operation (has id property and name, but specifically for delete it's DeleteEnvironmentInput)
        if (!('sourceId' in input) && !('description' in input)) {
          // This is DeleteEnvironmentInput
          this.logger.debug('[ManageEnvironmentsCommand] Deleting environment', {
            id: input.id
          });
          const result = await this.orchestrator.deleteEnvironment(input as DeleteEnvironmentInput);
          this.eventBus.publish({
            type: 'EnvironmentDeleted',
            data: {
              id: input.id
            }
          });
          return DeleteEnvironmentOutput.from(result);
        }
      }

      // Add operation (default)
      this.logger.debug('[ManageEnvironmentsCommand] Creating environment', {
        name: (input as AddEnvironmentInput).name
      });
      const result = await this.orchestrator.addEnvironment(input as AddEnvironmentInput);
      this.eventBus.publish({
        type: 'EnvironmentCreated',
        data: {
          id: result.id,
          name: result.name
        }
      });
      return AddEnvironmentOutput.from(result);
    } catch (error) {
      this.logger.error('[ManageEnvironmentsCommand] Failed to manage environment', error);
      throw error;
    }
  }
}
