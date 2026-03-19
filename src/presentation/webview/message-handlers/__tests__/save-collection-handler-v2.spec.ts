/**
 * SaveCollectionHandlerV2 Tests
 */

import { SaveCollectionCommand } from '../../../../application/commands';
import { SaveCollectionHandlerV2 } from '../save-collection-handler-v2';

describe('SaveCollectionHandlerV2', () => {
  let handler: SaveCollectionHandlerV2;
  let mockCommand: jest.Mocked<SaveCollectionCommand>;
  let mockLogger: any;

  beforeEach(() => {
    mockCommand = {
      execute: jest.fn(),
      validateInput: jest.fn()
    } as any;

    mockLogger = { debug: jest.fn(), error: jest.fn() };

    handler = new SaveCollectionHandlerV2(mockCommand, mockLogger);
  });

  it('should support save collection commands', () => {
    const commands = handler.getSupportedCommands();
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should save collection successfully', async () => {
    const mockMessenger = { postMessage: jest.fn() };
    mockCommand.execute.mockResolvedValue({ id: 'coll-new' } as any);

    await handler.handle('saveCollection', { name: 'My Collection' }, mockMessenger);

    expect(mockCommand.execute).toHaveBeenCalled();
  });
});
