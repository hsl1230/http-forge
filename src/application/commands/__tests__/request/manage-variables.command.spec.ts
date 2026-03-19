/**
 * ManageVariablesCommand Tests
 */

import { ManageVariableInput } from '../../../dto/variable.dto';
import { IEventBus } from '../../../interfaces/ievent-bus.interface';
import { IRequestOrchestrator } from '../../../interfaces/irequest-orchestrator.interface';
import { ManageVariablesCommand } from '../../request/manage-variables.command';

describe('ManageVariablesCommand', () => {
  let command: ManageVariablesCommand;
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

    mockEventBus = { publish: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() } as any;
    mockLogger = { debug: jest.fn(), error: jest.fn() };

    command = new ManageVariablesCommand(mockOrchestrator, mockEventBus, mockLogger);
  });

  it('should require operation type', () => {
    const input: ManageVariableInput = { operation: '' as any, name: '', scope: 'global' };

    expect(() => command.validateInput(input)).toThrow();
  });

  it('should manage variables successfully', async () => {
    const input: ManageVariableInput = {
      operation: 'add',
      name: 'apiUrl',
      value: 'http://api.test',
      scope: 'global'
    };

    mockOrchestrator.manageVariables.mockResolvedValue({ success: true } as any);

    const result = await command.execute(input);

    expect(mockOrchestrator.manageVariables).toHaveBeenCalledWith(input);
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});
