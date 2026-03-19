/**
 * SaveCollectionCommand Tests
 */

import { SaveCollectionInput, SaveCollectionOutput } from '../../../dto/collection.dto';
import { ICollectionOrchestrator } from '../../../interfaces/icollection-orchestrator.interface';
import { IEventBus } from '../../../interfaces/ievent-bus.interface';
import { SaveCollectionCommand } from '../../collection/save-collection.command';

describe('SaveCollectionCommand', () => {
  let command: SaveCollectionCommand;
  let mockOrchestrator: jest.Mocked<ICollectionOrchestrator>;
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockLogger: any;

  beforeEach(() => {
    mockOrchestrator = {
      saveCollection: jest.fn(),
      updateCollection: jest.fn()
    } as any;

    mockEventBus = { publish: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() } as any;
    mockLogger = { debug: jest.fn(), error: jest.fn() };

    command = new SaveCollectionCommand(mockOrchestrator, mockEventBus, mockLogger);
  });

  it('should throw error if collection name is missing', () => {
    const input: SaveCollectionInput = { name: '' };
    
    expect(() => command.validateInput(input)).toThrow();
  });

  it('should save collection successfully', async () => {
    const input: SaveCollectionInput = { name: 'My Collection' };

    mockOrchestrator.saveCollection.mockResolvedValue(
      new SaveCollectionOutput({ id: 'coll-123', name: 'My Collection', success: true, itemCount: 0 })
    );

    const result = await command.execute(input);

    expect(mockOrchestrator.saveCollection).toHaveBeenCalledWith(input);
    expect(mockEventBus.publish).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});
