/**
 * ManageVariableOutput DTO Tests
 */

import { ManageVariableOutput } from '../variable.dto';

describe('ManageVariableOutput', () => {
  it('should create from data object', () => {
    const variables = [
      { name: 'apiUrl', value: 'http://api.test', scope: 'collection' },
      { name: 'token', value: 'abc123', scope: 'environment' }
    ];
    const data = {
      success: true,
      message: 'Variable added',
      variable: variables[0],
      variables,
      scope: 'collection'
    };
    
    const output = ManageVariableOutput.from(data);
    
    expect(output.success).toBe(true);
    expect(output.message).toBe('Variable added');
    expect(output.variable).toEqual(variables[0]);
    expect(output.variables).toEqual(variables);
    expect(output.scope).toBe('collection');
  });

  it('should have default scope', () => {
    const output = new ManageVariableOutput({ success: true, variables: [] });
    expect(output.scope).toBe('collection');
  });

  it('should provide defaults for missing fields', () => {
    const output = new ManageVariableOutput({});
    
    expect(output.success).toBe(false);
    expect(output.message).toBe('');
    expect(output.variables).toEqual([]);
    expect(output.scope).toBe('collection');
  });

  it('should have readonly properties', () => {
    const output = new ManageVariableOutput({ success: true, variables: [] });
    
    expect(() => {
      (output as any).success = false;
    }).toThrow();
    
    expect(() => {
      (output as any).scope = 'environment';
    }).toThrow();
  });

  it('should be created via factory method', () => {
    const data = { success: true, variables: [] };
    const output = ManageVariableOutput.from(data);
    
    expect(output instanceof ManageVariableOutput).toBe(true);
  });
});
