/**
 * ManageCookiesCommand Tests
 */

import { ManageCookieInput } from '../../../dto/cookie.dto';
import { IEventBus } from '../../../interfaces/ievent-bus.interface';
import { IRequestOrchestrator } from '../../../interfaces/irequest-orchestrator.interface';
import { ManageCookiesCommand } from '../../request/execute-request-cookie.command';

describe('ManageCookiesCommand', () => {
  let command: ManageCookiesCommand;
  let mockOrchestrator: jest.Mocked<IRequestOrchestrator>;
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockLogger: any;

  beforeEach(() => {
    mockOrchestrator = {
      executeRequest: jest.fn(),
      saveRequest: jest.fn(),
      manageCookies: jest.fn(),
      manageVariables: jest.fn(),
      useHistoryEntry: jest.fn()
    } as any;

    mockEventBus = { publish: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() } as any;
    mockLogger = { debug: jest.fn(), error: jest.fn() };

    command = new ManageCookiesCommand(mockOrchestrator, mockEventBus, mockLogger);
  });

  it('should validate operation type', () => {
    const input: ManageCookieInput = { operation: 'invalid' as any };

    expect(() => command.validateInput(input)).toThrow();
  });

  it('should manage cookies successfully', async () => {
    const input: ManageCookieInput = {
      operation: 'add',
      name: 'session',
      value: 'abc123'
    };

    mockOrchestrator.manageCookies.mockResolvedValue({ success: true } as any);

    const result = await command.execute(input);

    expect(mockOrchestrator.manageCookies).toHaveBeenCalledWith(input);
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});
