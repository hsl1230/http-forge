/**
 * Message Handler Interface
 * 
 * Defines the contract for webview message handlers in the presentation layer.
 */

/**
 * Webview messenger for sending responses
 */
export interface IWebviewMessenger {
  postMessage(message: any): void;
}

/**
 * Base interface for webview message handlers
 */
export interface IMessageHandler {
  /**
   * Get the list of commands this handler supports
   */
  getSupportedCommands(): string[];

  /**
   * Handle a webview message
   * 
   * @param command The message command
   * @param message The message payload
   * @param messenger The webview messenger for responses
   * @returns Promise<boolean> true if handled
   */
  handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean>;
}
