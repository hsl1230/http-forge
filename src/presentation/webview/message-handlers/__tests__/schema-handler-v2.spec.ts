/**
 * SchemaHandlerV2 Tests
 */

import { ManageSchemaCommand } from '../../../../application/commands';
import { SchemaHandlerV2 } from '../schema-handler-v2';

describe('SchemaHandlerV2', () => {
  let handler: SchemaHandlerV2;
  let mockCommand: jest.Mocked<ManageSchemaCommand>;
  let mockLogger: any;

  beforeEach(() => {
    mockCommand = {
      execute: jest.fn(),
      validateInput: jest.fn()
    } as any;

    mockLogger = { debug: jest.fn(), error: jest.fn() };

    handler = new SchemaHandlerV2(mockCommand, mockLogger);
  });

  it('should support schema commands', () => {
    const commands = handler.getSupportedCommands();
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should fetch schema successfully', async () => {
    const mockMessenger = { postMessage: jest.fn() };
    mockCommand.execute.mockResolvedValue({ success: true, schema: {} } as any);

    await handler.handle('fetchSchema', { endpoint: 'http://api.test/schema' }, mockMessenger);

    expect(mockCommand.execute).toHaveBeenCalled();
  });
});
