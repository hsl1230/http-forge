/**
 * Environment Selection Handler V2
 */

import { SelectEnvironmentCommand } from '../../../application/commands';
import { IMessageHandler, IWebviewMessenger } from '../interfaces/imessage-handler.interface';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class EnvironmentSelectionHandlerV2 implements IMessageHandler {
  constructor(
    private command: SelectEnvironmentCommand,
    private logger: ILogger
  ) {}

  getSupportedCommands(): string[] {
    return ['selectEnvironment', 'switchEnvironment', 'activateEnvironment'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    this.logger.debug('[EnvironmentSelectionHandlerV2] Handling', { command });

    try {
      const output = await this.command.execute({
        id: message.id,
        name: message.name,
        context: message.context
      });

      messenger.postMessage({
        type: 'success',
        command,
        data: output
      });

      return true;
    } catch (error) {
      this.logger.error('[EnvironmentSelectionHandlerV2] Error', error);
      messenger.postMessage({
        type: 'error',
        command,
        error: (error as Error).message
      });
      return true;
    }
  }
}
