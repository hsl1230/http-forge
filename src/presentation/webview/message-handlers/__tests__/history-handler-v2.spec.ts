/**
 * HistoryHandlerV2 Tests
 */

import { ManageHistoryCommand } from '../../../../application/commands';
import { HistoryHandlerV2 } from '../history-handler-v2';

describe('HistoryHandlerV2', () => {
  let handler: HistoryHandlerV2;
  let mockCommand: jest.Mocked<ManageHistoryCommand>;
  let mockLogger: any;

  beforeEach(() => {
    mockCommand = {
      execute: jest.fn(),
      validateInput: jest.fn()
    } as any;

    mockLogger = { debug: jest.fn(), error: jest.fn() };

    handler = new HistoryHandlerV2(mockCommand, mockLogger);
  });

  it('should support history commands', () => {
    const commands = handler.getSupportedCommands();
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should handle history entry use', async () => {
    const mockMessenger = { postMessage: jest.fn() };
    mockCommand.execute.mockResolvedValue({ id: 'hist-123' } as any);

    await handler.handle('useHistoryEntry', { entryId: 'hist-123' }, mockMessenger);

    expect(mockCommand.execute).toHaveBeenCalled();
  });
});
