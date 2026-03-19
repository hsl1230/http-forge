/**
 * CookieHandlerV2 Tests
 */

import { ManageCookiesCommand } from '../../../../application/commands';
import { CookieHandlerV2 } from '../cookie-handler-v2';

describe('CookieHandlerV2', () => {
  let handler: CookieHandlerV2;
  let mockCommand: jest.Mocked<ManageCookiesCommand>;
  let mockLogger: any;

  beforeEach(() => {
    mockCommand = {
      execute: jest.fn(),
      validateInput: jest.fn()
    } as any;

    mockLogger = { debug: jest.fn(), error: jest.fn() };

    handler = new CookieHandlerV2(mockCommand, mockLogger);
  });

  it('should support cookie command', () => {
    const commands = handler.getSupportedCommands();
    expect(commands).toContain('addCookie');
  });

  it('should handle cookie management', async () => {
    const message = {
      command: 'addCookie',
      operation: 'add',
      name: 'session'
    };

    const mockMessenger = { postMessage: jest.fn() };
    mockCommand.execute.mockResolvedValue({ success: true } as any);

    await handler.handle('addCookie', message, mockMessenger);

    expect(mockCommand.execute).toHaveBeenCalled();
    expect(mockMessenger.postMessage).toHaveBeenCalled();
  });
});
