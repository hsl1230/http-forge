/**
 * SaveTestSuiteCommand Tests
 */

import { SaveSuiteInput } from '../../../dto/test-suite.dto';
import { IEventBus } from '../../../interfaces/ievent-bus.interface';
import { ITestSuiteOrchestrator } from '../../../interfaces/itest-suite-orchestrator.interface';
import { SaveTestSuiteCommand } from '../../suite/save-test-suite.command';

describe('SaveTestSuiteCommand', () => {
  let command: SaveTestSuiteCommand;
  let mockOrchestrator: jest.Mocked<ITestSuiteOrchestrator>;
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockLogger: any;

  beforeEach(() => {
    mockOrchestrator = {
      runSuite: jest.fn(),
      saveSuite: jest.fn(),
      browseSuiteData: jest.fn(),
      exportResults: jest.fn()
    } as any;

    mockEventBus = { publish: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() } as any;
    mockLogger = { debug: jest.fn(), error: jest.fn() };

    command = new SaveTestSuiteCommand(mockOrchestrator, mockEventBus, mockLogger);
  });

  it('should require suite name', () => {
    const input: SaveSuiteInput = { name: '' };

    expect(() => command.validateInput(input)).toThrow();
  });

  it('should save test suite successfully', async () => {
    const input: SaveSuiteInput = { name: 'API Tests' };

    mockOrchestrator.saveSuite.mockResolvedValue({ id: 'suite-new' } as any);

    const result = await command.execute(input);

    expect(mockOrchestrator.saveSuite).toHaveBeenCalledWith(input);
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});
