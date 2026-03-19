/**
 * Manage OAuth2 Command
 */

import { ManageOAuth2Input, ManageOAuth2Output } from '../../dto/oauth2.dto';
import { ICommand } from '../../interfaces/icommand.interface';
import { IEventBus } from '../../interfaces/ievent-bus.interface';
import { IOAuth2Orchestrator } from '../../interfaces/ioauth2-orchestrator.interface';

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class ManageOAuth2Command implements ICommand<ManageOAuth2Input, ManageOAuth2Output> {
  constructor(
    private orchestrator: IOAuth2Orchestrator,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {}

  validateInput(input: ManageOAuth2Input): void {
    if (!input || typeof input !== 'object') {
      throw new Error('ManageOAuth2Command: Input must be a valid object');
    }

    if (!input.operation || !['authorize', 'refresh', 'revoke', 'clear'].includes(input.operation)) {
      throw new Error('ManageOAuth2Command: Valid operation required (authorize, refresh, revoke, clear)');
    }
  }

  async execute(input: ManageOAuth2Input): Promise<ManageOAuth2Output> {
    this.validateInput(input);
    this.logger.debug('[ManageOAuth2Command] Managing OAuth2', { operation: input.operation });

    try {
      const result = await this.orchestrator.manageOAuth2(input);

      this.eventBus.publish({
        type: 'OAuth2TokenUpdated',
        data: {
          operation: input.operation,
          success: result.success,
          expiresIn: result.expiresIn
        }
      });

      return ManageOAuth2Output.from(result);
    } catch (error) {
      this.logger.error('[ManageOAuth2Command] Failed to manage OAuth2', error);
      throw error;
    }
  }
}
