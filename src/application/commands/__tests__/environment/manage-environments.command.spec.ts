/**
 * ManageEnvironmentsCommand Tests
 */

import { AddEnvironmentInput } from '../../../dto/environment-crud.dto';
import { IEnvironmentOrchestrator } from '../../../interfaces/ienvironment-orchestrator.interface';
import { IEventBus } from '../../../interfaces/ievent-bus.interface';
import { ManageEnvironmentsCommand } from '../../environment/manage-environments.command';

describe('ManageEnvironmentsCommand', () => {
  let command: ManageEnvironmentsCommand;
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

    command = new ManageEnvironmentsCommand(mockOrchestrator, mockEventBus, mockLogger);
  });

  it('should validate operation type', () => {
    const input: AddEnvironmentInput = { name: 'Test' };

    expect(() => command.validateInput(input)).toThrow();
  });

  it('should add environment successfully', async () => {
    const input: AddEnvironmentInput = { name: 'Staging' };

    mockOrchestrator.addEnvironment.mockResolvedValue({ id: 'env-new' } as any);

    const result = await command.execute(input);

    expect(mockOrchestrator.addEnvironment).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});
