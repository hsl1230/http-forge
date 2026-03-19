/**
 * GraphQL DTO Tests
 */

import { ManageGraphQLOutput } from '../graphql.dto';

describe('ManageGraphQLOutput', () => {
  it('should create from data object', () => {
    const completions = [
      { label: 'query', kind: 14 },
      { label: 'mutation', kind: 14 }
    ];
    const data = {
      success: true,
      message: 'Schema fetched',
      completions,
      cached: false,
      duration: 300,
      types: [
        { name: 'Query', kind: 'OBJECT' },
        { name: 'User', kind: 'OBJECT' }
      ]
    };
    
    const output = ManageGraphQLOutput.from(data);
    
    expect(output.success).toBe(true);
    expect(output.getCompletionCount()).toBe(2);
    expect(output.getTypeCount()).toBe(2);
  });

  it('should count completions correctly', () => {
    const completions = [{}, {}, {}];
    const output = new ManageGraphQLOutput({ completions });
    
    expect(output.getCompletionCount()).toBe(3);
  });

  it('should count types correctly', () => {
    const types = [{}, {}, {}, {}];
    const output = new ManageGraphQLOutput({ types });
    
    expect(output.getTypeCount()).toBe(4);
  });

  it('should handle missing completions', () => {
    const output = new ManageGraphQLOutput({});
    expect(output.getCompletionCount()).toBe(0);
    expect(output.getTypeCount()).toBe(0);
  });

  it('should have readonly properties', () => {
    const output = new ManageGraphQLOutput({ success: true });
    
    expect(() => {
      (output as any).success = false;
    }).toThrow();
  });
});
