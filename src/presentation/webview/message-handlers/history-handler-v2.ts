/**
 * History Handler V2
 */

import { ManageHistoryCommand } from '../../../application/commands';
import { IMessageHandler, IWebviewMessenger } from '../interfaces/imessage-handler.interface';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class HistoryHandlerV2 implements IMessageHandler {
  constructor(
    private command: ManageHistoryCommand,
    private logger: ILogger
  ) {}

  getSupportedCommands(): string[] {
    return ['useHistoryEntry', 'loadHistoryEntry', 'selectHistory'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    this.logger.debug('[HistoryHandlerV2] Handling', { command });

    try {
      const output = await this.command.execute({
        id: message.id,
        filter: message.filter
      });

      messenger.postMessage({
        type: 'success',
        command,
        data: output
      });

      return true;
    } catch (error) {
      this.logger.error('[HistoryHandlerV2] Error', error);
      messenger.postMessage({
        type: 'error',
        command,
        error: (error as Error).message
      });
      return true;
    }
  }
}
