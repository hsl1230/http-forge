/**
 * EnvironmentConfigHandlerV2 Tests
 */

import { ManageConfigCommand } from '../../../../application/commands';
import { EnvironmentConfigHandlerV2 } from '../environment-config-handler-v2';

describe('EnvironmentConfigHandlerV2', () => {
  let handler: EnvironmentConfigHandlerV2;
  let mockCommand: jest.Mocked<ManageConfigCommand>;
  let mockLogger: any;

  beforeEach(() => {
    mockCommand = {
      execute: jest.fn(),
      validateInput: jest.fn()
    } as any;

    mockLogger = { debug: jest.fn(), error: jest.fn() };

    handler = new EnvironmentConfigHandlerV2(mockCommand, mockLogger);
  });

  it('should support environment config commands', () => {
    const commands = handler.getSupportedCommands();
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should handle loadConfig successfully', async () => {
    const mockMessenger = { postMessage: jest.fn() };
    mockCommand.execute.mockResolvedValue({ success: true } as any);

    await handler.handle('loadConfig', {}, mockMessenger);

    expect(mockCommand.execute).toHaveBeenCalled();
  });
});
