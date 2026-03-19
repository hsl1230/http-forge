/**
 * Save Request Handler V2
 */

import { SaveRequestCommand } from '../../../application/commands';
import { IMessageHandler, IWebviewMessenger } from '../interfaces/imessage-handler.interface';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class SaveRequestHandlerV2 implements IMessageHandler {
  constructor(
    private command: SaveRequestCommand,
    private logger: ILogger
  ) {}

  getSupportedCommands(): string[] {
    return ['saveRequest', 'saveAsRequest', 'createRequest'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    this.logger.debug('[SaveRequestHandlerV2] Handling', { command });

    try {
      const output = await this.command.execute({
        name: message.name,
        method: message.method,
        url: message.url,
        body: message.body,
        headers: message.headers,
        collectionId: message.collectionId,
        folderId: message.folderId,
        auth: message.auth
      });

      messenger.postMessage({
        type: 'success',
        command,
        data: output
      });

      return true;
    } catch (error) {
      this.logger.error('[SaveRequestHandlerV2] Error', error);
      messenger.postMessage({
        type: 'error',
        command,
        error: (error as Error).message
      });
      return true;
    }
  }
}
