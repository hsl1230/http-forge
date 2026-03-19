/**
 * EnvironmentSelectionHandlerV2 Tests
 */

import { SelectEnvironmentCommand } from '../../../../application/commands';
import { EnvironmentSelectionHandlerV2 } from '../environment-selection-handler-v2';

describe('EnvironmentSelectionHandlerV2', () => {
  let handler: EnvironmentSelectionHandlerV2;
  let mockCommand: jest.Mocked<SelectEnvironmentCommand>;
  let mockLogger: any;

  beforeEach(() => {
    mockCommand = {
      execute: jest.fn(),
      validateInput: jest.fn()
    } as any;

    mockLogger = { debug: jest.fn(), error: jest.fn() };

    handler = new EnvironmentSelectionHandlerV2(mockCommand, mockLogger);
  });

  it('should support environment selection commands', () => {
    const commands = handler.getSupportedCommands();
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should select environment successfully', async () => {
    const mockMessenger = { postMessage: jest.fn() };
    mockCommand.execute.mockResolvedValue({ id: 'env-123', name: 'Development' } as any);

    await handler.handle('selectEnvironment', { id: 'env-123' }, mockMessenger);

    expect(mockCommand.execute).toHaveBeenCalled();
  });
});
