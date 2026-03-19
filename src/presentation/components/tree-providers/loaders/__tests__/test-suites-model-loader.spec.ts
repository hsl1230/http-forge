/**
 * TestSuitesModelLoader Tests
 */

import { TestSuitesModelLoader } from '../test-suites-model-loader';

describe('TestSuitesModelLoader', () => {
  let loader: TestSuitesModelLoader;
  let mockService: any;
  let mockLogger: any;

  beforeEach(() => {
    mockService = {
      getTestSuites: jest.fn(),
      getSuiteRequests: jest.fn()
    };

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn()
    };

    loader = new TestSuitesModelLoader(mockService, mockLogger);
  });

  it('should load all test suites', async () => {
    const mockSuites = [
      { id: 'suite-1', name: 'API Tests' },
      { id: 'suite-2', name: 'Integration Tests' }
    ];

    mockService.getTestSuites.mockResolvedValue(mockSuites);

    const result = await loader.loadSuites();

    expect(result).toHaveLength(2);
    expect(mockService.getTestSuites).toHaveBeenCalled();
  });

  it('should load requests for suite', async () => {
    const mockRequests = [
      { id: 'req-1', name: 'Test User Creation' },
      { id: 'req-2', name: 'Test User Retrieval' }
    ];

    mockService.getSuiteRequests.mockResolvedValue(mockRequests);

    const result = await loader.loadChildren({ id: 'suite-123', name: 'Test', requestCount: 0 });

    expect(result).toHaveLength(2);
    expect(mockService.getSuiteRequests).toHaveBeenCalledWith('suite-123');
  });

  it('should handle errors', async () => {
    mockService.getTestSuites.mockRejectedValue(new Error('Load error'));

    await expect(loader.loadSuites()).rejects.toThrow('Load error');
  });
});
