/**
 * Save Collection Handler V2
 */

import { SaveCollectionCommand } from '../../../application/commands';
import { IMessageHandler, IWebviewMessenger } from '../interfaces/imessage-handler.interface';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class SaveCollectionHandlerV2 implements IMessageHandler {
  constructor(
    private command: SaveCollectionCommand,
    private logger: ILogger
  ) {}

  getSupportedCommands(): string[] {
    return ['saveCollection', 'createCollection'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    this.logger.debug('[SaveCollectionHandlerV2] Handling', { command });

    try {
      const output = await this.command.execute({
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
      this.logger.error('[SaveCollectionHandlerV2] Error', error);
      messenger.postMessage({
        type: 'error',
        command,
        error: (error as Error).message
      });
      return true;
    }
  }
}
