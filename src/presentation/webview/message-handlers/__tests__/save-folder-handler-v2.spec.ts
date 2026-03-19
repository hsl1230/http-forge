/**
 * SaveFolderHandlerV2 Tests
 */

import { SaveFolderCommand } from '../../../../application/commands';
import { SaveFolderHandlerV2 } from '../save-folder-handler-v2';

describe('SaveFolderHandlerV2', () => {
  let handler: SaveFolderHandlerV2;
  let mockCommand: jest.Mocked<SaveFolderCommand>;
  let mockLogger: any;

  beforeEach(() => {
    mockCommand = {
      execute: jest.fn(),
      validateInput: jest.fn()
    } as any;

    mockLogger = { debug: jest.fn(), error: jest.fn() };

    handler = new SaveFolderHandlerV2(mockCommand, mockLogger);
  });

  it('should support save folder commands', () => {
    const commands = handler.getSupportedCommands();
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should save folder successfully', async () => {
    const mockMessenger = { postMessage: jest.fn() };
    mockCommand.execute.mockResolvedValue({ id: 'fold-new' } as any);

    await handler.handle('saveFolder', { name: 'API Endpoints', collectionId: 'coll-123' }, mockMessenger);

    expect(mockCommand.execute).toHaveBeenCalled();
  });
});
