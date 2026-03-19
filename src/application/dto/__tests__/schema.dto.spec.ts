/**
 * Schema DTO Tests
 */

import { ManageSchemaOutput } from '../schema.dto';

describe('ManageSchemaOutput', () => {
  it('should create from data object', () => {
    const schema = { types: [], queryType: 'Query' };
    const data = {
      success: true,
      message: 'Schema fetched',
      schema,
      cacheKey: 'http://graphql.test',
      cached: false,
      duration: 250
    };
    
    const output = ManageSchemaOutput.from(data);
    
    expect(output.success).toBe(true);
    expect(output.schema).toEqual(schema);
    expect(output.cached).toBe(false);
    expect(output.duration).toBe(250);
  });

  it('should provide defaults', () => {
    const output = new ManageSchemaOutput({});
    
    expect(output.success).toBe(false);
    expect(output.message).toBe('');
    expect(output.cached).toBe(false);
  });

  it('should have readonly properties', () => {
    const output = new ManageSchemaOutput({ success: true });
    
    expect(() => {
      (output as any).success = false;
    }).toThrow();
  });
});
