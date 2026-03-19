/**
 * Environment CRUD DTOs Tests
 */

import { AddEnvironmentOutput, DeleteEnvironmentOutput, DuplicateEnvironmentOutput } from '../environment-crud.dto';

describe('AddEnvironmentOutput', () => {
  it('should create from data object', () => {
    const data = {
      id: 'env-new-123',
      name: 'New Environment',
      description: 'Test environment',
      createdAt: Date.now(),
      variables: { apiUrl: 'http://test' }
    };
    
    const output = AddEnvironmentOutput.from(data);
    
    expect(output.id).toBe(data.id);
    expect(output.name).toBe(data.name);
    expect(output.variables).toEqual(data.variables);
  });

  it('should have readonly properties', () => {
    const output = new AddEnvironmentOutput({ id: 'env-123', name: 'Test' });
    
    expect(() => {
      (output as any).id = 'modified';
    }).toThrow();
  });
});

describe('DeleteEnvironmentOutput', () => {
  it('should create deletion confirmation', () => {
    const data = {
      id: 'env-del-123',
      message: 'Environment deleted',
      success: true
    };
    
    const output = DeleteEnvironmentOutput.from(data);
    
    expect(output.id).toBe(data.id);
    expect(output.success).toBe(true);
    expect(output.message).toBe(data.message);
  });

  it('should provide default message', () => {
    const output = new DeleteEnvironmentOutput({ id: 'env-123', success: true });
    expect(output.message).toBe('Environment deleted successfully');
  });
});

describe('DuplicateEnvironmentOutput', () => {
  it('should create from data object', () => {
    const data = {
      id: 'env-dup-456',
      name: 'Duplicated Environment',
      variables: { key: 'value' },
      createdAt: Date.now(),
      sourceId: 'env-original-123'
    };
    
    const output = DuplicateEnvironmentOutput.from(data);
    
    expect(output.id).toBe(data.id);
    expect(output.sourceId).toBe(data.sourceId);
    expect(output.variables).toEqual(data.variables);
  });

  it('should have readonly properties', () => {
    const output = new DuplicateEnvironmentOutput({ id: 'env-dup-789', name: 'Dup' });
    
    expect(() => {
      (output as any).sourceId = 'modified';
    }).toThrow();
  });
});
