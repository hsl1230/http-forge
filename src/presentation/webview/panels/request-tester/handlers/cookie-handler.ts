import type { IAsyncCookieService } from '@http-forge/core';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';

/**
 * Handles cookie management operations
 * Single Responsibility: Only manages cookie CRUD operations
 */
export class CookieHandler implements IMessageHandler {
  constructor(private cookieService: IAsyncCookieService) {}

  getSupportedCommands(): string[] {
    return ['getCookies', 'setCookie', 'deleteCookie', 'clearCookies'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    switch (command) {
      case 'getCookies':
        this.sendCookies(messenger);
        return true;

      case 'setCookie':
        await this.handleSetCookie(message.cookie, messenger);
        return true;

      case 'deleteCookie':
        await this.handleDeleteCookie(message.name, message.domain, messenger);
        return true;

      case 'clearCookies':
        await this.cookieService.clear();
        this.sendCookies(messenger);
        return true;

      default:
        return false;
    }
  }

  /**
   * Get all cookies for initialization
   */
  getAllCookies() {
    return this.cookieService.getAll();
  }

  private sendCookies(messenger: IWebviewMessenger): void {
    const cookies = this.cookieService.getAll();
    messenger.postMessage({
      command: 'cookiesLoaded',
      cookies
    });
  }

  private async handleSetCookie(cookie: any, messenger: IWebviewMessenger): Promise<void> {
    await this.cookieService.set(cookie);
    this.sendCookies(messenger);
  }

  private async handleDeleteCookie(name: string, domain: string, messenger: IWebviewMessenger): Promise<void> {
    await this.cookieService.delete(name, domain);
    this.sendCookies(messenger);
  }
}
