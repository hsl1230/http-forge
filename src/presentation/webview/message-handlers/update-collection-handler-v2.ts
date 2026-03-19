/**
 * Update Collection Handler V2
 */

import { UpdateCollectionCommand } from '../../../application/commands';
import { IMessageHandler, IWebviewMessenger } from '../interfaces/imessage-handler.interface';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class UpdateCollectionHandlerV2 implements IMessageHandler {
  constructor(
    private command: UpdateCollectionCommand,
    private logger: ILogger
  ) {}

  getSupportedCommands(): string[] {
    return ['updateCollection', 'modifyCollection'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    this.logger.debug('[UpdateCollectionHandlerV2] Handling', { command });

    try {
      const output = await this.command.execute({
        id: message.id,
        name: message.name,
        description: message.description,
        items: message.items,
        variables: message.variables,
        auth: message.auth
      });

      messenger.postMessage({
        type: 'success',
        command,
        data: output
      });

      return true;
    } catch (error) {
      this.logger.error('[UpdateCollectionHandlerV2] Error', error);
      messenger.postMessage({
        type: 'error',
        command,
        error: (error as Error).message
      });
      return true;
    }
  }
}
