/**
 * OAuth2 Handler V2
 */

import { ManageOAuth2Command } from '../../../application/commands';
import { IMessageHandler, IWebviewMessenger } from '../interfaces/imessage-handler.interface';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class OAuth2HandlerV2 implements IMessageHandler {
  constructor(
    private command: ManageOAuth2Command,
    private logger: ILogger
  ) {}

  getSupportedCommands(): string[] {
    return ['oauth2Authorize', 'oauth2Refresh', 'oauth2Revoke', 'oauth2Clear'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    this.logger.debug('[OAuth2HandlerV2] Handling', { command });

    try {
      const output = await this.command.execute({
        operation: message.operation,
        config: message.config,
        credentials: message.credentials,
        requestBody: message.requestBody
      });

      messenger.postMessage({
        type: 'success',
        command,
        data: output
      });

      return true;
    } catch (error) {
      this.logger.error('[OAuth2HandlerV2] Error', error);
      messenger.postMessage({
        type: 'error',
        command,
        error: (error as Error).message
      });
      return true;
    }
  }
}
