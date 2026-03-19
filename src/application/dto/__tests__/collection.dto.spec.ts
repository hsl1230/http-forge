/**
 * Collection DTOs Tests
 */

import { SaveCollectionOutput, UpdateCollectionOutput } from '../collection.dto';

describe('SaveCollectionOutput', () => {
  it('should create from data object', () => {
    const data = {
      id: 'coll-123',
      name: 'API Collection',
      success: true,
      itemCount: 5,
      savedAt: Date.now(),
      path: '/API Collection'
    };
    
    const output = SaveCollectionOutput.from(data);
    
    expect(output.id).toBe(data.id);
    expect(output.name).toBe(data.name);
    expect(output.success).toBe(true);
    expect(output.itemCount).toBe(5);
  });

  it('should have readonly properties', () => {
    const output = new SaveCollectionOutput({ id: 'coll-456', name: 'Test' });
    
    expect(() => {
      (output as any).id = 'modified';
    }).toThrow();
    
    expect(() => {
      (output as any).success = false;
    }).toThrow();
  });
});

describe('UpdateCollectionOutput', () => {
  it('should create from data object', () => {
    const data = {
      id: 'coll-upd-789',
      name: 'Updated Collection',
      success: true,
      updated: ['name', 'description'],
      updatedAt: Date.now(),
      changedItems: 3
    };
    
    const output = UpdateCollectionOutput.from(data);
    
    expect(output.id).toBe(data.id);
    expect(output.updated).toEqual(['name', 'description']);
    expect(output.changedItems).toBe(3);
  });

  it('should provide defaults', () => {
    const output = new UpdateCollectionOutput({ id: 'coll-000', name: 'Test' });
    
    expect(output.success).toBe(false);
    expect(output.updated).toEqual([]);
  });

  it('should have readonly properties', () => {
    const output = new UpdateCollectionOutput({ id: 'coll-111', name: 'Test' });
    
    expect(() => {
      (output as any).updated = ['changed'];
    }).toThrow();
  });
});
