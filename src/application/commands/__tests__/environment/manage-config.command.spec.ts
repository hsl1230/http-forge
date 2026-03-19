/**
 * ManageConfigCommand Tests
 */

import { IEnvironmentOrchestrator } from '../../../interfaces/ienvironment-orchestrator.interface';
import { IEventBus } from '../../../interfaces/ievent-bus.interface';
import { ManageConfigCommand, ManageConfigInput } from '../../environment/manage-config.command';

describe('ManageConfigCommand', () => {
  let command: ManageConfigCommand;
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

    command = new ManageConfigCommand(mockOrchestrator, mockEventBus, mockLogger);
  });

  it('should require config operation', () => {
    const input: ManageConfigInput = { operation: 'load' };

    expect(() => command.validateInput({ operation: '' } as any)).toThrow();
  });

  it('should manage config successfully', async () => {
    const input: ManageConfigInput = { operation: 'save' };

    mockOrchestrator.manageConfig.mockResolvedValue({ success: true } as any);

    const result = await command.execute(input);

    expect(mockOrchestrator.manageConfig).toHaveBeenCalledWith(input);
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});
