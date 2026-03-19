/**
 * SaveFolderCommand Tests
 */

import { SaveFolderInput } from '../../../dto/folder.dto';
import { IEventBus } from '../../../interfaces/ievent-bus.interface';
import { IFolderOrchestrator } from '../../../interfaces/ifolder-orchestrator.interface';
import { SaveFolderCommand } from '../../folder/save-folder.command';

describe('SaveFolderCommand', () => {
  let command: SaveFolderCommand;
  let mockOrchestrator: jest.Mocked<IFolderOrchestrator>;
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockLogger: any;

  beforeEach(() => {
    mockOrchestrator = {
      saveFolder: jest.fn()
    } as any;

    mockEventBus = { publish: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() } as any;
    mockLogger = { debug: jest.fn(), error: jest.fn() };

    command = new SaveFolderCommand(mockOrchestrator, mockEventBus, mockLogger);
  });

  it('should require folder name', () => {
    const input: SaveFolderInput = { name: '' };

    expect(() => command.validateInput(input)).toThrow();
  });

  it('should save folder successfully', async () => {
    const input: SaveFolderInput = {
      name: 'API Endpoints'
    };

    mockOrchestrator.saveFolder.mockResolvedValue({ id: 'fold-new' } as any);

    const result = await command.execute(input);

    expect(mockOrchestrator.saveFolder).toHaveBeenCalledWith(input);
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});
