/**
 * Folder DTO Tests
 */

import { SaveFolderOutput } from '../folder.dto';

describe('SaveFolderOutput', () => {
  it('should create from data object', () => {
    const data = {
      id: 'fold-123',
      name: 'API Endpoints',
      parentId: 'coll-456',
      collectionId: 'coll-456',
      success: true,
      path: '/API Endpoints',
      createdAt: Date.now(),
      itemCount: 5
    };
    
    const output = SaveFolderOutput.from(data);
    
    expect(output.id).toBe(data.id);
    expect(output.name).toBe(data.name);
    expect(output.success).toBe(true);
    expect(output.itemCount).toBe(5);
  });

  it('should suggest default path', () => {
    const output = new SaveFolderOutput({
      id: 'fold-789',
      name: 'Test Folder'
    });
    
    expect(output.path).toBe('/Test Folder');
  });

  it('should have readonly properties', () => {
    const output = new SaveFolderOutput({ id: 'fold-000', name: 'Test' });
    
    expect(() => {
      (output as any).id = 'modified';
    }).toThrow();
    
    expect(() => {
      (output as any).path = '/modified';
    }).toThrow();
  });
});
