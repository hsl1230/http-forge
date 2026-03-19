/**
 * UpdateCollectionHandlerV2 Tests
 */

import { UpdateCollectionCommand } from '../../../../application/commands';
import { UpdateCollectionHandlerV2 } from '../update-collection-handler-v2';

describe('UpdateCollectionHandlerV2', () => {
  let handler: UpdateCollectionHandlerV2;
  let mockCommand: jest.Mocked<UpdateCollectionCommand>;
  let mockLogger: any;

  beforeEach(() => {
    mockCommand = {
      execute: jest.fn(),
      validateInput: jest.fn()
    } as any;

    mockLogger = { debug: jest.fn(), error: jest.fn() };

    handler = new UpdateCollectionHandlerV2(mockCommand, mockLogger);
  });

  it('should support update collection commands', () => {
    const commands = handler.getSupportedCommands();
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should update collection successfully', async () => {
    const mockMessenger = { postMessage: jest.fn() };
    mockCommand.execute.mockResolvedValue({ id: 'coll-123' } as any);

    await handler.handle('updateCollection', { id: 'coll-123', name: 'Updated Collection' }, mockMessenger);

    expect(mockCommand.execute).toHaveBeenCalled();
  });
});
