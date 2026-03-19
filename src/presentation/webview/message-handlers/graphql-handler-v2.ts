/**
 * GraphQL Handler V2
 */

import { ManageGraphQLCommand } from '../../../application/commands';
import { IMessageHandler, IWebviewMessenger } from '../interfaces/imessage-handler.interface';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class GraphQLHandlerV2 implements IMessageHandler {
  constructor(
    private command: ManageGraphQLCommand,
    private logger: ILogger
  ) {}

  getSupportedCommands(): string[] {
    return ['graphqlFetchSchema', 'graphqlGetCompletions', 'graphqlClearCache'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    this.logger.debug('[GraphQLHandlerV2] Handling', { command });

    try {
      const output = await this.command.execute({
        operation: message.operation,
        endpoint: message.endpoint,
        headers: message.headers,
        auth: message.auth,
        content: message.content,
        position: message.position,
        query: message.query
      });

      messenger.postMessage({
        type: 'success',
        command,
        data: output
      });

      return true;
    } catch (error) {
      this.logger.error('[GraphQLHandlerV2] Error', error);
      messenger.postMessage({
        type: 'error',
        command,
        error: (error as Error).message
      });
      return true;
    }
  }
}
