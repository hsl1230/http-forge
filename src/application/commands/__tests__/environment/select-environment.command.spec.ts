/**
 * SelectEnvironmentCommand Tests
 */

import { SelectEnvironmentInput } from '../../../dto/environment.dto';
import { IEnvironmentOrchestrator } from '../../../interfaces/ienvironment-orchestrator.interface';
import { IEventBus } from '../../../interfaces/ievent-bus.interface';
import { SelectEnvironmentCommand } from '../../environment/select-environment.command';

describe('SelectEnvironmentCommand', () => {
  let command: SelectEnvironmentCommand;
  let mockOrchestrator: jest.Mocked<IEnvironmentOrchestrator>;
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockLogger: any;

  beforeEach(() => {
    mockOrchestrator = {
      selectEnvironment: jest.fn(),
      addEnvironment: jest.fn(),
      deleteEnvironment: jest.fn(),
      duplicateEnvironment: jest.fn(),
      manageConfig: jest.fn()
    } as any;

    mockEventBus = { publish: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() } as any;
    mockLogger = { debug: jest.fn(), error: jest.fn() };

    command = new SelectEnvironmentCommand(mockOrchestrator, mockEventBus, mockLogger);
  });

  it('should require environment ID', () => {
    const input: SelectEnvironmentInput = { id: '' };

    expect(() => command.validateInput(input)).toThrow();
  });

  it('should select environment successfully', async () => {
    const input: SelectEnvironmentInput = { id: 'env-123' };

    mockOrchestrator.selectEnvironment.mockResolvedValue({
      id: 'env-123',
      name: 'Development'
    } as any);

    const result = await command.execute(input);

    expect(mockOrchestrator.selectEnvironment).toHaveBeenCalledWith(input);
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});
