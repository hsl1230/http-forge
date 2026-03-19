/**
 * Variable Handler V2
 */

import { ManageVariablesCommand } from '../../../application/commands';
import { IMessageHandler, IWebviewMessenger } from '../interfaces/imessage-handler.interface';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class VariableHandlerV2 implements IMessageHandler {
  constructor(
    private command: ManageVariablesCommand,
    private logger: ILogger
  ) {}

  getSupportedCommands(): string[] {
    return ['addVariable', 'updateVariable', 'deleteVariable', 'manageVariable'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    this.logger.debug('[VariableHandlerV2] Handling', { command });

    try {
      const output = await this.command.execute({
        operation: message.operation,
        scope: message.scope,
        name: message.name,
        value: message.value,
        scopeId: message.scopeId,
        enabled: message.enabled
      });

      messenger.postMessage({
        type: 'success',
        command,
        data: output
      });

      return true;
    } catch (error) {
      this.logger.error('[VariableHandlerV2] Error', error);
      messenger.postMessage({
        type: 'error',
        command,
        error: (error as Error).message
      });
      return true;
    }
  }
}
