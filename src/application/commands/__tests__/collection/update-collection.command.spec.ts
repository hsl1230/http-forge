/**
 * UpdateCollectionCommand Tests
 */

import { UpdateCollectionInput } from '../../../dto/collection.dto';
import { ICollectionOrchestrator } from '../../../interfaces/icollection-orchestrator.interface';
import { IEventBus } from '../../../interfaces/ievent-bus.interface';
import { UpdateCollectionCommand } from '../../collection/update-collection.command';

describe('UpdateCollectionCommand', () => {
  let command: UpdateCollectionCommand;
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

    command = new UpdateCollectionCommand(mockOrchestrator, mockEventBus, mockLogger);
  });

  it('should throw error if collection ID is missing', () => {
    const input: UpdateCollectionInput = { id: '', name: 'Updated' };

    expect(() => command.validateInput(input)).toThrow();
  });

  it('should update collection successfully', async () => {
    const input: UpdateCollectionInput = {
      id: 'coll-123',
      name: 'Updated Collection'
    };

    mockOrchestrator.updateCollection.mockResolvedValue({ id: 'coll-123' } as any);

    const result = await command.execute(input);

    expect(mockOrchestrator.updateCollection).toHaveBeenCalledWith(input);
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});
