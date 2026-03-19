/**
 * Cookie Handler V2
 */

import { ManageCookiesCommand } from '../../../application/commands';
import { IMessageHandler, IWebviewMessenger } from '../interfaces/imessage-handler.interface';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class CookieHandlerV2 implements IMessageHandler {
  constructor(
    private command: ManageCookiesCommand,
    private logger: ILogger
  ) {}

  getSupportedCommands(): string[] {
    return ['addCookie', 'deleteCookie', 'updateCookie', 'clearCookies', 'getCookies'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    this.logger.debug('[CookieHandlerV2] Handling', { command });

    try {
      const output = await this.command.execute({
        operation: message.operation,
        domain: message.domain,
        name: message.name,
        value: message.value,
        path: message.path,
        httpOnly: message.httpOnly,
        secure: message.secure
      });

      messenger.postMessage({
        type: 'success',
        command,
        data: output
      });

      return true;
    } catch (error) {
      this.logger.error('[CookieHandlerV2] Error', error);
      messenger.postMessage({
        type: 'error',
        command,
        error: (error as Error).message
      });
      return true;
    }
  }
}
