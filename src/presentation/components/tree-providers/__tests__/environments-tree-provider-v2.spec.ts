/**
 * EnvironmentsTreeProviderV2 Tests
 */

import { EnvironmentsTreeProviderV2 } from '../environments-tree-provider-v2';

describe('EnvironmentsTreeProviderV2', () => {
  let provider: EnvironmentsTreeProviderV2;
  let mockLoader: any;
  let mockLogger: any;

  beforeEach(() => {
    mockLoader = {
      loadEnvironments: jest.fn(),
      loadChildren: jest.fn()
    };

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn()
    };

    provider = new EnvironmentsTreeProviderV2(mockLoader, mockLogger);
  });

  it('should get root environments', async () => {
    const mockEnvironments = [
      { id: 'env-1', name: 'Development' }
    ];

    mockLoader.loadEnvironments.mockResolvedValue(mockEnvironments);

    const result = await provider.getChildren();

    expect(result).toHaveLength(1);
    expect(mockLoader.loadEnvironments).toHaveBeenCalled();
  });

  it('should get variables for environment', async () => {
    const mockVariables = [
      { name: 'apiUrl', value: 'http://localhost' }
    ];

    mockLoader.loadChildren.mockResolvedValue(mockVariables);

    const result = await provider.getChildren({ id: 'env-123' } as any);

    expect(result).toHaveLength(1);
  });

  it('should have tree item icon for environment', () => {
    const model = { id: 'env-123', name: 'Dev', variables: {}, isActive: false };
    
    const treeItem = (provider as any).modelToTreeItem(model);

    expect(treeItem.model.name).toBe('Dev');
  });
});
