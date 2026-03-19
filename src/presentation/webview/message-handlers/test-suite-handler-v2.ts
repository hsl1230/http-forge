/**
 * Test Suite Handler V2
 */

import {
    BrowseSuiteDataCommand,
    ExportSuiteResultsCommand,
    RunTestSuiteCommand,
    SaveTestSuiteCommand
} from '../../../application/commands';
import { IMessageHandler, IWebviewMessenger } from '../interfaces/imessage-handler.interface';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class TestSuiteHandlerV2 implements IMessageHandler {
  constructor(
    private runCommand: RunTestSuiteCommand,
    private saveCommand: SaveTestSuiteCommand,
    private exportCommand: ExportSuiteResultsCommand,
    private browseCommand: BrowseSuiteDataCommand,
    private logger: ILogger
  ) {}

  getSupportedCommands(): string[] {
    return ['runSuite', 'saveSuite', 'exportSuite', 'browseSuiteData'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    this.logger.debug('[TestSuiteHandlerV2] Handling', { command });

    try {
      let output;
      if (command === 'runSuite') {
        output = await this.runCommand.execute({
          id: message.id,
          suite: message.suite,
          environment: message.environment,
          options: message.options
        });
      } else if (command === 'saveSuite') {
        output = await this.saveCommand.execute({
          name: message.name,
          description: message.description,
          requests: message.requests,
          config: message.config,
          variables: message.variables
        });
      } else if (command === 'exportSuite') {
        output = await this.exportCommand.execute({
          id: message.id,
          format: message.format,
          options: message.options
        });
      } else if (command === 'browseSuiteData') {
        output = await this.browseCommand.execute({
          id: message.id,
          path: message.path,
          limit: message.limit,
          offset: message.offset
        });
      }

      messenger.postMessage({
        type: 'success',
        command,
        data: output
      });

      return true;
    } catch (error) {
      this.logger.error('[TestSuiteHandlerV2] Error', error);
      messenger.postMessage({
        type: 'error',
        command,
        error: (error as Error).message
      });
      return true;
    }
  }
}
