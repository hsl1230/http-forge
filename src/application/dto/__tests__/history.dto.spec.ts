/**
 * UseHistoryEntryOutput DTO Tests
 */

import { UseHistoryEntryOutput } from '../history.dto';

describe('UseHistoryEntryOutput', () => {
  it('should create from data object', () => {
    const data = {
      id: 'hist-123',
      request: { method: 'GET', url: 'http://api.test' },
      response: { statusCode: 200, body: 'OK' },
      timestamp: Date.now(),
      duration: 100,
      statusCode: 200
    };
    
    const output = UseHistoryEntryOutput.from(data);
    
    expect(output.id).toBe('hist-123');
    expect(output.request).toEqual(data.request);
    expect(output.response).toEqual(data.response);
    expect(output.duration).toBe(100);
    expect(output.statusCode).toBe(200);
  });

  it('should have default timestamp', () => {
    const data = { id: 'hist-123', request: {} };
    const before = Date.now();
    const output = new UseHistoryEntryOutput(data);
    const after = Date.now();
    
    expect(output.timestamp).toBeGreaterThanOrEqual(before);
    expect(output.timestamp).toBeLessThanOrEqual(after);
  });

  it('should be created via static from() method', () => {
    const data = { id: 'hist-456', request: { method: 'POST' } };
    const output = UseHistoryEntryOutput.from(data);
    
    expect(output instanceof UseHistoryEntryOutput).toBe(true);
    expect(output.id).toBe('hist-456');
  });

  it('should have readonly properties', () => {
    const output = new UseHistoryEntryOutput({ id: 'hist-789', request: {} });
    
    expect(() => {
      (output as any).id = 'modified';
    }).toThrow();
    
    expect(() => {
      (output as any).timestamp = 0;
    }).toThrow();
  });

  it('should handle missing optional fields gracefully', () => {
    const data = { id: 'hist-000', request: {} };
    const output = new UseHistoryEntryOutput(data);
    
    expect(output.response).toBeUndefined();
    expect(output.duration).toBeUndefined();
    expect(output.statusCode).toBeUndefined();
  });
});
