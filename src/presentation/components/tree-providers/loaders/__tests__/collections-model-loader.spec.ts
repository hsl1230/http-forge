/**
 * CollectionsModelLoader Tests
 */

import { CollectionsModelLoader } from '../collections-model-loader';

describe('CollectionsModelLoader', () => {
  let loader: CollectionsModelLoader;
  let mockService: any;
  let mockLogger: any;

  beforeEach(() => {
    mockService = {
      getCollections: jest.fn(),
      getCollectionItems: jest.fn()
    };

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn()
    };

    loader = new CollectionsModelLoader(mockService, mockLogger);
  });

  it('should load all collections', async () => {
    const mockCollections = [
      { id: 'coll-1', name: 'API Collection' },
      { id: 'coll-2', name: 'GraphQL Collection' }
    ];

    mockService.getCollections.mockResolvedValue(mockCollections);

    const result = await loader.loadCollections();

    expect(result).toHaveLength(2);
    expect(mockService.getCollections).toHaveBeenCalled();
  });

  it('should load children items for collection', async () => {
    const mockItems = [
      { id: 'item-1', name: 'Get Users', type: 'request' },
      { id: 'folder-1', name: 'Nested', type: 'folder' }
    ];

    mockService.getCollectionItems.mockResolvedValue(mockItems);

    const result = await loader.loadChildren({ id: 'coll-123', name: 'Test', itemCount: 0 });

    expect(result).toHaveLength(2);
    expect(mockService.getCollectionItems).toHaveBeenCalledWith('coll-123');
  });

  it('should handle load errors', async () => {
    mockService.getCollections.mockRejectedValue(new Error('Load failed'));

    await expect(loader.loadCollections()).rejects.toThrow('Load failed');
  });
});
