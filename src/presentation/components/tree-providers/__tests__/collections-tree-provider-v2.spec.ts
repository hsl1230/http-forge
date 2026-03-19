/**
 * CollectionsTreeProviderV2 Tests
 */

import { CollectionsTreeProviderV2 } from '../collections-tree-provider-v2';

describe('CollectionsTreeProviderV2', () => {
  let provider: CollectionsTreeProviderV2;
  let mockLoader: any;
  let mockLogger: any;

  beforeEach(() => {
    mockLoader = {
      loadCollections: jest.fn(),
      loadChildren: jest.fn()
    };

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn()
    };

    provider = new CollectionsTreeProviderV2(mockLoader, mockLogger);
  });

  it('should get root collections', async () => {
    const mockCollections = [
      { id: 'coll-1', name: 'API Collection' }
    ];

    mockLoader.loadCollections.mockResolvedValue(mockCollections);

    const result = await provider.getChildren();

    expect(result).toHaveLength(1);
    expect(mockLoader.loadCollections).toHaveBeenCalled();
  });

  it('should get nested children for collection', async () => {
    const mockItems = [
      { id: 'item-1', name: 'Request 1', type: 'request' }
    ];

    mockLoader.loadChildren.mockResolvedValue(mockItems);

    const result = await provider.getChildren({ id: 'coll-123' } as any);

    expect(result).toHaveLength(1);
    expect(mockLoader.loadChildren).toHaveBeenCalledWith('coll-123');
  });

  it('should convert model to tree item', () => {
    const model = { id: 'coll-123', name: 'Test Collection', itemCount: 3 };

    const treeItem = (provider as any).modelToTreeItem(model);

    expect(treeItem.model.name).toBe('Test Collection');
  });

  it('should fire onDidChangeTreeData event', () => {
    const listener = jest.fn();
    provider.onDidChangeTreeData(listener);

    provider.refresh();

    expect(listener).toHaveBeenCalled();
  });
});
