/**
 * TestSuitesTreeProviderV2 Tests
 */

import { TestSuitesTreeProviderV2 } from '../test-suites-tree-provider-v2';

describe('TestSuitesTreeProviderV2', () => {
  let provider: TestSuitesTreeProviderV2;
  let mockLoader: any;
  let mockLogger: any;

  beforeEach(() => {
    mockLoader = {
      loadSuites: jest.fn(),
      loadChildren: jest.fn()
    };

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn()
    };

    provider = new TestSuitesTreeProviderV2(mockLoader, mockLogger);
  });

  it('should get root test suites', async () => {
    const mockSuites = [
      { id: 'suite-1', name: 'API Tests' }
    ];

    mockLoader.loadSuites.mockResolvedValue(mockSuites);

    const result = await provider.getChildren();

    expect(result).toHaveLength(1);
    expect(mockLoader.loadSuites).toHaveBeenCalled();
  });

  it('should get requests for test suite', async () => {
    const mockRequests = [
      { id: 'req-1', name: 'Test 1' }
    ];

    mockLoader.loadChildren.mockResolvedValue(mockRequests);

    const result = await provider.getChildren({ id: 'suite-123' } as any);

    expect(result).toHaveLength(1);
    expect(mockLoader.loadChildren).toHaveBeenCalledWith('suite-123');
  });

  it('should convert suite model to tree item', () => {
    const model = { id: 'suite-123', name: 'Test Suite', requestCount: 5 };
    
    const treeItem = (provider as any).modelToTreeItem(model);

    expect(treeItem.model.name).toBe('Test Suite');
  });
});
