/**
 * ManageHistoryCommand Tests
 */

import { UseHistoryEntryInput } from '../../../dto/history.dto';
import { IEventBus } from '../../../interfaces/ievent-bus.interface';
import { IRequestOrchestrator } from '../../../interfaces/irequest-orchestrator.interface';
import { ManageHistoryCommand } from '../../request/manage-history.command';

describe('ManageHistoryCommand', () => {
  let command: ManageHistoryCommand;
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

    command = new ManageHistoryCommand(mockOrchestrator, mockEventBus, mockLogger);
  });

  it('should validate operation field', () => {
    const input: UseHistoryEntryInput = { id: '' };

    expect(() => command.validateInput(input)).toThrow();
  });

  it('should use history entry successfully', async () => {
    const input: UseHistoryEntryInput = {
      id: 'hist-123'
    };

    mockOrchestrator.useHistoryEntry.mockResolvedValue({ id: 'hist-123' } as any);

    const result = await command.execute(input);

    expect(mockOrchestrator.useHistoryEntry).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});
