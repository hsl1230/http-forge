/**
 * SaveRequestCommand Tests
 */

import { IEventBus } from '../../../interfaces/ievent-bus.interface';
import { IRequestOrchestrator } from '../../../interfaces/irequest-orchestrator.interface';
import { SaveRequestCommand, SaveRequestInput } from '../../request/manage-cookies.command';

describe('SaveRequestCommand', () => {
  let command: SaveRequestCommand;
  let mockOrchestrator: jest.Mocked<IRequestOrchestrator>;
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockLogger: any;

  beforeEach(() => {
    mockOrchestrator = {
      executeRequest: jest.fn(),
      saveRequest: jest.fn(),
      manageCookies: jest.fn(),
      manageVariables: jest.fn(),
      useHistoryEntry: jest.fn()
    } as any;

    mockEventBus = {
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    } as any;

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn()
    };

    command = new SaveRequestCommand(mockOrchestrator, mockEventBus, mockLogger);
  });

  it('should validate required fields', () => {
    const input: SaveRequestInput = { name: '', method: '', url: '' };

    expect(() => command.validateInput(input)).toThrow();
  });

  it('should save request successfully', async () => {
    const input: SaveRequestInput = {
      name: 'Get Users',
      url: 'http://api.test/users',
      method: 'GET'
    };

    mockOrchestrator.saveRequest.mockResolvedValue({ id: 'req-123' } as any);

    const result = await command.execute(input);

    expect(mockOrchestrator.saveRequest).toHaveBeenCalledWith(input);
    expect(mockEventBus.publish).toHaveBeenCalled();
  });

  it('should handle save errors', async () => {
    const input: SaveRequestInput = { name: 'Test', method: 'GET', url: 'http://test' };
    mockOrchestrator.saveRequest.mockRejectedValue(new Error('Save failed'));

    await expect(command.execute(input)).rejects.toThrow('Save failed');
  });
});

