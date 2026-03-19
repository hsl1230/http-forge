/**
 * Manage Cookies Command
 * 
 * Command for managing cookies across requests.
 */

import { ManageCookieInput, ManageCookieOutput } from '../../dto/cookie.dto';
import { ICommand } from '../../interfaces/icommand.interface';
import { IEventBus } from '../../interfaces/ievent-bus.interface';
import { IRequestOrchestrator } from '../../interfaces/irequest-orchestrator.interface';

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

/**
 * Command to manage cookies
 */
export class ManageCookiesCommand implements ICommand<ManageCookieInput, ManageCookieOutput> {
  constructor(
    private orchestrator: IRequestOrchestrator,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {}

  /**
   * Validate cookie management input
   */
  validateInput(input: ManageCookieInput): void {
    if (!input || typeof input !== 'object') {
      throw new Error('ManageCookiesCommand: Input must be a valid object');
    }

    if (!input.operation || !['add', 'update', 'delete', 'clear'].includes(input.operation)) {
      throw new Error('ManageCookiesCommand: Valid operation is required (add, update, delete, clear)');
    }

    if (input.operation !== 'clear') {
      if (!input.domain || typeof input.domain !== 'string') {
        throw new Error('ManageCookiesCommand: Cookie domain is required');
      }

      if (!input.name || typeof input.name !== 'string') {
        throw new Error('ManageCookiesCommand: Cookie name is required');
      }

      if (input.operation !== 'delete' && (!input.value || typeof input.value !== 'string')) {
        throw new Error('ManageCookiesCommand: Cookie value is required for add/update operations');
      }
    }
  }

  /**
   * Execute the manage cookies command
   */
  async execute(input: ManageCookieInput): Promise<ManageCookieOutput> {
    this.validateInput(input);
    this.logger.debug('[ManageCookiesCommand] Managing cookie', {
      operation: input.operation,
      domain: input.domain,
      name: input.name
    });

    try {
      const result = await this.orchestrator.manageCookies(input);

      this.eventBus.publish({
        type: 'CookieUpdated',
        data: {
          operation: input.operation,
          domain: input.domain,
          name: input.name,
          cookieCount: result.count
        }
      });

      return ManageCookieOutput.from(result);
    } catch (error) {
      this.logger.error('[ManageCookiesCommand] Failed to manage cookie', error);
      throw error;
    }
  }
}
