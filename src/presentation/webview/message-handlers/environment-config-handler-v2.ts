/**
 * Environment Config Handler V2
 */

import { ManageConfigCommand } from '../../../application/commands';
import { IMessageHandler, IWebviewMessenger } from '../interfaces/imessage-handler.interface';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class EnvironmentConfigHandlerV2 implements IMessageHandler {
  constructor(
    private command: ManageConfigCommand,
    private logger: ILogger
  ) {}

  getSupportedCommands(): string[] {
    return ['loadConfig', 'saveConfig', 'resetConfig'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    this.logger.debug('[EnvironmentConfigHandlerV2] Handling', { command });

    try {
      const output = await this.command.execute({
        operation: message.operation,
        filePath: message.filePath,
        config: message.config
      });

      messenger.postMessage({
        type: 'success',
        command,
        data: output
      });

      return true;
    } catch (error) {
      this.logger.error('[EnvironmentConfigHandlerV2] Error', error);
      messenger.postMessage({
        type: 'error',
        command,
        error: (error as Error).message
      });
      return true;
    }
  }
}
