/**
 * ExecuteRequestHandlerV2 Tests
 */

import { ExecuteRequestCommand } from '../../../../application/commands';
import { ExecuteRequestHandlerV2 } from '../execute-request-handler-v2';

describe('ExecuteRequestHandlerV2', () => {
  let handler: ExecuteRequestHandlerV2;
  let mockCommand: jest.Mocked<ExecuteRequestCommand>;
  let mockLogger: any;

  beforeEach(() => {
    mockCommand = {
      execute: jest.fn(),
      validateInput: jest.fn()
    } as any;

    mockLogger = { debug: jest.fn(), error: jest.fn() };

    handler = new ExecuteRequestHandlerV2(mockCommand, mockLogger);
  });

  it('should return supported commands', () => {
    const commands = handler.getSupportedCommands();
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should handle execute request successfully', async () => {
    const mockMessenger = { postMessage: jest.fn() };
    mockCommand.execute.mockResolvedValue({ statusCode: 200 } as any);

    await handler.handle('executeRequest', { url: 'http://api.test', method: 'GET' }, mockMessenger);

    expect(mockCommand.execute).toHaveBeenCalled();
  });

  it('should handle command execution errors', async () => {
    const mockMessenger = { postMessage: jest.fn() };
    mockCommand.execute.mockRejectedValue(new Error('Request failed'));

    await handler.handle('executeRequest', {}, mockMessenger);

    expect(mockLogger.error).toHaveBeenCalled();
  });
});
