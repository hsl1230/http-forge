/**
 * ExecuteRequestCommand Tests
 */

import { ExecuteRequestInput } from '../../../dto/request.dto';
import { IEventBus } from '../../../interfaces/ievent-bus.interface';
import { IRequestOrchestrator } from '../../../interfaces/irequest-orchestrator.interface';
import { ExecuteRequestCommand } from '../../request/execute-request.command';

describe('ExecuteRequestCommand', () => {
  let command: ExecuteRequestCommand;
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
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    command = new ExecuteRequestCommand(mockOrchestrator, mockEventBus, mockLogger);
  });

  it('should throw error if URL is missing', () => {
    const invalidInput: ExecuteRequestInput = { request: null };

    expect(() => command.validateInput(invalidInput)).toThrow();
  });

  it('should execute request successfully', async () => {
    const input: ExecuteRequestInput = {
      request: { url: 'http://api.test/endpoint', method: 'GET' }
    };

    const mockOutput = { statusCode: 200, body: 'OK' };
    mockOrchestrator.executeRequest.mockResolvedValue(mockOutput as any);

    const result = await command.execute(input);

    expect(mockOrchestrator.executeRequest).toHaveBeenCalledWith(input);
    expect(result).toEqual(mockOutput);
    expect(mockEventBus.publish).toHaveBeenCalled();
  });

  it('should log debug info on execution', async () => {
    const input: ExecuteRequestInput = {
      request: { url: 'http://api.test', method: 'POST' }
    };

    mockOrchestrator.executeRequest.mockResolvedValue({} as any);

    await command.execute(input);

    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it('should handle orchestrator errors', async () => {
    const input: ExecuteRequestInput = {
      request: { url: 'http://api.test', method: 'GET' }
    };

    mockOrchestrator.executeRequest.mockRejectedValue(new Error('Network error'));

    await expect(command.execute(input)).rejects.toThrow('Network error');
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
