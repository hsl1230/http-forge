/**
 * SelectEnvironmentOutput DTO Tests
 */

import { SelectEnvironmentOutput } from '../environment.dto';

describe('SelectEnvironmentOutput', () => {
  it('should create from data object', () => {
    const data = {
      id: 'env-123',
      name: 'Development',
      variables: { apiUrl: 'http://localhost:3000', token: 'dev-token' },
      description: 'Development environment',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const output = SelectEnvironmentOutput.from(data);
    
    expect(output.id).toBe('env-123');
    expect(output.name).toBe('Development');
    expect(output.variables).toEqual(data.variables);
    expect(output.isActive).toBe(true);
  });

  it('should provide defaults', () => {
    const output = new SelectEnvironmentOutput({});
    
    expect(output.id).toBe('');
    expect(output.name).toBe('');
    expect(output.variables).toEqual({});
    expect(output.isActive).toBe(false);
  });

  it('should have readonly properties', () => {
    const output = new SelectEnvironmentOutput({ id: 'env-456', name: 'Test' });
    
    expect(() => {
      (output as any).id = 'modified';
    }).toThrow();
    
    expect(() => {
      (output as any).isActive = true;
    }).toThrow();
  });

  it('should be created via factory method', () => {
    const data = { id: 'env-789', name: 'Production' };
    const output = SelectEnvironmentOutput.from(data);
    
    expect(output instanceof SelectEnvironmentOutput).toBe(true);
  });

  it('should include optional timestamps', () => {
    const createdAt = Date.now() - 3600000;
    const data = { id: 'env-001', name: 'Staging', createdAt, updatedAt: Date.now() };
    const output = new SelectEnvironmentOutput(data);
    
    expect(output.createdAt).toBe(createdAt);
    expect(output.updatedAt).toBe(data.updatedAt);
  });
});
