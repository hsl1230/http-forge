/**
 * SaveRequestHandlerV2 Tests
 */

import { SaveRequestCommand } from '../../../../application/commands';
import { SaveRequestHandlerV2 } from '../save-request-handler-v2';

describe('SaveRequestHandlerV2', () => {
  let handler: SaveRequestHandlerV2;
  let mockCommand: jest.Mocked<SaveRequestCommand>;
  let mockLogger: any;

  beforeEach(() => {
    mockCommand = {
      execute: jest.fn(),
      validateInput: jest.fn()
    } as any;

    mockLogger = { debug: jest.fn(), error: jest.fn() };

    handler = new SaveRequestHandlerV2(mockCommand, mockLogger);
  });

  it('should support save request commands', () => {
    const commands = handler.getSupportedCommands();
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should save request successfully', async () => {
    const mockMessenger = { postMessage: jest.fn() };
    mockCommand.execute.mockResolvedValue({ id: 'req-123' } as any);

    await handler.handle('saveRequest', { name: 'Get Users', url: 'http://api.test/users', method: 'GET' }, mockMessenger);

    expect(mockCommand.execute).toHaveBeenCalled();
  });
});
