/**
 * OAuth2HandlerV2 Tests
 */

import { ManageOAuth2Command } from '../../../../application/commands';
import { OAuth2HandlerV2 } from '../oauth2-handler-v2';

describe('OAuth2HandlerV2', () => {
  let handler: OAuth2HandlerV2;
  let mockCommand: jest.Mocked<ManageOAuth2Command>;
  let mockLogger: any;

  beforeEach(() => {
    mockCommand = {
      execute: jest.fn(),
      validateInput: jest.fn()
    } as any;

    mockLogger = { debug: jest.fn(), error: jest.fn() };

    handler = new OAuth2HandlerV2(mockCommand, mockLogger);
  });

  it('should support OAuth2 commands', () => {
    const commands = handler.getSupportedCommands();
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should authorize OAuth2 flow', async () => {
    const mockMessenger = { postMessage: jest.fn() };
    mockCommand.execute.mockResolvedValue({ success: true, accessToken: 'token-xyz' } as any);

    await handler.handle('oauth2Authorize', { clientId: 'client-123' }, mockMessenger);

    expect(mockCommand.execute).toHaveBeenCalled();
  });
});
