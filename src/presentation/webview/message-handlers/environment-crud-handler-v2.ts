/**
 * Environment CRUD Handler V2
 */

import { ManageEnvironmentsCommand } from '../../../application/commands';
import { IMessageHandler, IWebviewMessenger } from '../interfaces/imessage-handler.interface';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class EnvironmentCrudHandlerV2 implements IMessageHandler {
  constructor(
    private command: ManageEnvironmentsCommand,
    private logger: ILogger
  ) {}

  getSupportedCommands(): string[] {
    return ['addEnvironment', 'deleteEnvironment', 'duplicateEnvironment'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    this.logger.debug('[EnvironmentCrudHandlerV2] Handling', { command });

    try {
      let output;
      if (command === 'addEnvironment') {
        output = await this.command.execute({
          name: message.name,
          description: message.description,
          variables: message.variables
        });
      } else if (command === 'deleteEnvironment') {
        output = await this.command.execute({
          id: message.id,
          name: message.name
        });
      } else if (command === 'duplicateEnvironment') {
        output = await this.command.execute({
          sourceId: message.sourceId,
          newName: message.newName,
          newDescription: message.newDescription
        });
      }

      messenger.postMessage({
        type: 'success',
        command,
        data: output
      });

      return true;
    } catch (error) {
      this.logger.error('[EnvironmentCrudHandlerV2] Error', error);
      messenger.postMessage({
        type: 'error',
        command,
        error: (error as Error).message
      });
      return true;
    }
  }
}
