/**
 * Schema Handler V2
 */

import { ManageSchemaCommand } from '../../../application/commands';
import { IMessageHandler, IWebviewMessenger } from '../interfaces/imessage-handler.interface';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class SchemaHandlerV2 implements IMessageHandler {
  constructor(
    private command: ManageSchemaCommand,
    private logger: ILogger
  ) {}

  getSupportedCommands(): string[] {
    return ['fetchSchema', 'manageSchema', 'infer Schema'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    this.logger.debug('[SchemaHandlerV2] Handling', { command });

    try {
      const output = await this.command.execute({
        operation: message.operation,
        endpoint: message.endpoint,
        schemaType: message.schemaType,
        headers: message.headers,
        auth: message.auth,
        query: message.query
      });

      messenger.postMessage({
        type: 'success',
        command,
        data: output
      });

      return true;
    } catch (error) {
      this.logger.error('[SchemaHandlerV2] Error', error);
      messenger.postMessage({
        type: 'error',
        command,
        error: (error as Error).message
      });
      return true;
    }
  }
}
