/**
 * TestSuiteHandlerV2 Tests
 */

import {
  BrowseSuiteDataCommand,
  ExportSuiteResultsCommand,
  RunTestSuiteCommand,
  SaveTestSuiteCommand
} from '../../../../application/commands';
import { TestSuiteHandlerV2 } from '../test-suite-handler-v2';

describe('TestSuiteHandlerV2', () => {
  let handler: TestSuiteHandlerV2;
  let mockRunCommand: jest.Mocked<RunTestSuiteCommand>;
  let mockSaveCommand: jest.Mocked<SaveTestSuiteCommand>;
  let mockExportCommand: jest.Mocked<ExportSuiteResultsCommand>;
  let mockBrowseCommand: jest.Mocked<BrowseSuiteDataCommand>;
  let mockLogger: any;

  beforeEach(() => {
    mockRunCommand = { execute: jest.fn(), validateInput: jest.fn() } as any;
    mockSaveCommand = { execute: jest.fn(), validateInput: jest.fn() } as any;
    mockExportCommand = { execute: jest.fn(), validateInput: jest.fn() } as any;
    mockBrowseCommand = { execute: jest.fn(), validateInput: jest.fn() } as any;

    mockLogger = { debug: jest.fn(), error: jest.fn() };

    handler = new TestSuiteHandlerV2(mockRunCommand, mockSaveCommand, mockExportCommand, mockBrowseCommand, mockLogger);
  });

  it('should support test suite commands', () => {
    const commands = handler.getSupportedCommands();
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should run test suite successfully', async () => {
    const mockMessenger = { postMessage: jest.fn() };
    mockRunCommand.execute.mockResolvedValue({ executionId: 'exec-123', totalTests: 10, passedTests: 9 } as any);

    await handler.handle('runSuite', { id: 'suite-123' }, mockMessenger);

    expect(mockRunCommand.execute).toHaveBeenCalled();
  });
});
