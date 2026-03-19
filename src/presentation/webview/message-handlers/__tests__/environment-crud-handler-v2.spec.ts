/**
 * EnvironmentCrudHandlerV2 Tests
 */

import { ManageEnvironmentsCommand } from '../../../../application/commands';
import { EnvironmentCrudHandlerV2 } from '../environment-crud-handler-v2';

describe('EnvironmentCrudHandlerV2', () => {
  let handler: EnvironmentCrudHandlerV2;
  let mockCommand: jest.Mocked<ManageEnvironmentsCommand>;
  let mockLogger: any;

  beforeEach(() => {
    mockCommand = {
      execute: jest.fn(),
      validateInput: jest.fn()
    } as any;

    mockLogger = { debug: jest.fn(), error: jest.fn() };

    handler = new EnvironmentCrudHandlerV2(mockCommand, mockLogger);
  });

  it('should support environment CRUD commands', () => {
    const commands = handler.getSupportedCommands();
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should add environment successfully', async () => {
    const mockMessenger = { postMessage: jest.fn() };
    mockCommand.execute.mockResolvedValue({ id: 'env-new' } as any);

    await handler.handle('addEnvironment', {}, mockMessenger);

    expect(mockCommand.execute).toHaveBeenCalled();
  });
});
