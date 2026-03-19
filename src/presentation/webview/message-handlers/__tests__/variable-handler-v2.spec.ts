/**
 * VariableHandlerV2 Tests
 */

import { ManageVariablesCommand } from '../../../../application/commands';
import { VariableHandlerV2 } from '../variable-handler-v2';

describe('VariableHandlerV2', () => {
  let handler: VariableHandlerV2;
  let mockCommand: jest.Mocked<ManageVariablesCommand>;
  let mockLogger: any;

  beforeEach(() => {
    mockCommand = {
      execute: jest.fn(),
      validateInput: jest.fn()
    } as any;

    mockLogger = { debug: jest.fn(), error: jest.fn() };

    handler = new VariableHandlerV2(mockCommand, mockLogger);
  });

  it('should support variable commands', () => {
    const commands = handler.getSupportedCommands();
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should add variable successfully', async () => {
    const mockMessenger = { postMessage: jest.fn() };
    mockCommand.execute.mockResolvedValue({ success: true, variables: [] } as any);

    await handler.handle('addVariable', { name: 'apiUrl', value: 'http://api.test' }, mockMessenger);

    expect(mockCommand.execute).toHaveBeenCalled();
  });
});
