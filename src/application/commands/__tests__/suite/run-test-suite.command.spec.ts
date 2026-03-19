/**
 * RunTestSuiteCommand Tests
 */

import { RunSuiteInput } from '../../../dto/test-suite.dto';
import { IEventBus } from '../../../interfaces/ievent-bus.interface';
import { ITestSuiteOrchestrator } from '../../../interfaces/itest-suite-orchestrator.interface';
import { RunTestSuiteCommand } from '../../suite/run-test-suite.command';

describe('RunTestSuiteCommand', () => {
  let command: RunTestSuiteCommand;
  let mockOrchestrator: jest.Mocked<ITestSuiteOrchestrator>;
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockLogger: any;

  beforeEach(() => {
    mockOrchestrator = {
      runSuite: jest.fn(),
      saveSuite: jest.fn(),
      browseSuiteData: jest.fn(),
      exportResults: jest.fn()
    };

    mockEventBus = { publish: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() };
    mockLogger = { debug: jest.fn(), error: jest.fn() };

    command = new RunTestSuiteCommand(mockOrchestrator, mockEventBus, mockLogger);
  });

  it('should require suite ID', () => {
    const input: RunSuiteInput = { id: '' };

    expect(() => command.validateInput(input)).toThrow();
  });

  it('should run test suite successfully', async () => {
    const input: RunSuiteInput = { id: 'suite-123' };

    mockOrchestrator.runSuite.mockResolvedValue({
      executionId: 'exec-123',
      totalTests: 10,
      passedTests: 9
    } as any);

    const result = await command.execute(input);

    expect(mockOrchestrator.runSuite).toHaveBeenCalledWith(input);
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});
