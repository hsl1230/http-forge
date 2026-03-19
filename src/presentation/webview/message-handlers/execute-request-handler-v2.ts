/**
 * Execute Request Handler V2
 * 
 * Handles request execution messages from the webview.
 */

import { ExecuteRequestCommand } from '../../../application/commands';
import { IMessageHandler, IWebviewMessenger } from '../interfaces/imessage-handler.interface';

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

/**
 * Handler for request execution messages
 */
export class ExecuteRequestHandlerV2 implements IMessageHandler {
  constructor(
    private command: ExecuteRequestCommand,
    private logger: ILogger
  ) {}

  getSupportedCommands(): string[] {
    return ['sendRequest', 'sendHttpRequest', 'executeRequest'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    this.logger.debug('[ExecuteRequestHandlerV2] Handling', { command });

    try {
      const output = await this.command.execute({
        request: message.request,
        environment: message.environment,
        authentication: message.authentication,
        cookies: message.cookies,
        variables: message.variables
      });

      messenger.postMessage({
        type: 'success',
        command,
        data: output
      });

      return true;
    } catch (error) {
      this.logger.error('[ExecuteRequestHandlerV2] Error', error);
      messenger.postMessage({
        type: 'error',
        command,
        error: (error as Error).message
      });
      return true;
    }
  }
}
