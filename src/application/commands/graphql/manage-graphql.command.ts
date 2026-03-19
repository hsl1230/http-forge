/**
 * Manage GraphQL Command
 */

import { ManageGraphQLInput, ManageGraphQLOutput } from '../../dto/graphql.dto';
import { ICommand } from '../../interfaces/icommand.interface';
import { IEventBus } from '../../interfaces/ievent-bus.interface';
import { IGraphQLOrchestrator } from '../../interfaces/igraphql-orchestrator.interface';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class ManageGraphQLCommand implements ICommand<ManageGraphQLInput, ManageGraphQLOutput> {
  constructor(
    private orchestrator: IGraphQLOrchestrator,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {}

  validateInput(input: ManageGraphQLInput): void {
    if (!input || typeof input !== 'object') {
      throw new Error('ManageGraphQLCommand: Input must be a valid object');
    }

    if (!input.operation || !['fetchSchema', 'getCompletions', 'clearCache'].includes(input.operation)) {
      throw new Error('ManageGraphQLCommand: Valid operation required (fetchSchema, getCompletions, clearCache)');
    }

    if (input.operation === 'fetchSchema' && !input.endpoint) {
      throw new Error('ManageGraphQLCommand: Endpoint required for schema fetch');
    }
  }

  async execute(input: ManageGraphQLInput): Promise<ManageGraphQLOutput> {
    this.validateInput(input);
    this.logger.debug('[ManageGraphQLCommand] Managing GraphQL', {
      operation: input.operation,
      endpoint: input.endpoint
    });

    try {
      const result = await this.orchestrator.manageGraphQL(input);

      this.eventBus.publish({
        type: 'GraphQLDataUpdated',
        data: {
          operation: input.operation,
          success: result.success,
          cached: result.cached
        }
      });

      return ManageGraphQLOutput.from(result);
    } catch (error) {
      this.logger.error('[ManageGraphQLCommand] Failed to manage GraphQL', error);
      throw error;
    }
  }
}
