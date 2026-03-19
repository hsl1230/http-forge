/**
 * Save Folder Handler V2
 */

import { SaveFolderCommand } from '../../../application/commands';
import { IMessageHandler, IWebviewMessenger } from '../interfaces/imessage-handler.interface';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class SaveFolderHandlerV2 implements IMessageHandler {
  constructor(
    private command: SaveFolderCommand,
    private logger: ILogger
  ) {}

  getSupportedCommands(): string[] {
    return ['saveFolder', 'createFolder'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    this.logger.debug('[SaveFolderHandlerV2] Handling', { command });

    try {
      const output = await this.command.execute({
        name: message.name,
        parentId: message.parentId,
        description: message.description,
        collectionId: message.collectionId
      });

      messenger.postMessage({
        type: 'success',
        command,
        data: output
      });

      return true;
    } catch (error) {
      this.logger.error('[SaveFolderHandlerV2] Error', error);
      messenger.postMessage({
        type: 'error',
        command,
        error: (error as Error).message
      });
      return true;
    }
  }
}
