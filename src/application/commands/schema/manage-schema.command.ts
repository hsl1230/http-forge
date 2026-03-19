/**
 * Manage Schema Command
 */

import { ManageSchemaInput, ManageSchemaOutput } from '../../dto/schema.dto';
import { ICommand } from '../../interfaces/icommand.interface';
import { IEventBus } from '../../interfaces/ievent-bus.interface';
import { ISchemaOrchestrator } from '../../interfaces/ischema-orchestrator.interface';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class ManageSchemaCommand implements ICommand<ManageSchemaInput, ManageSchemaOutput> {
  constructor(
    private orchestrator: ISchemaOrchestrator,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {}

  validateInput(input: ManageSchemaInput): void {
    if (!input || typeof input !== 'object') {
      throw new Error('ManageSchemaCommand: Input must be a valid object');
    }

    if (!input.operation || !['fetch', 'cache', 'clear'].includes(input.operation)) {
      throw new Error('ManageSchemaCommand: Valid operation required (fetch, cache, clear)');
    }

    if (input.operation === 'fetch' && !input.endpoint) {
      throw new Error('ManageSchemaCommand: Endpoint required for fetch operation');
    }
  }

  async execute(input: ManageSchemaInput): Promise<ManageSchemaOutput> {
    this.validateInput(input);
    this.logger.debug('[ManageSchemaCommand] Managing schema', {
      operation: input.operation,
      endpoint: input.endpoint
    });

    try {
      const result = await this.orchestrator.manageSchema(input);

      this.eventBus.publish({
        type: 'SchemaManaged',
        data: {
          operation: input.operation,
          success: result.success,
          cached: result.cached
        }
      });

      return ManageSchemaOutput.from(result);
    } catch (error) {
      this.logger.error('[ManageSchemaCommand] Failed to manage schema', error);
      throw error;
    }
  }
}
