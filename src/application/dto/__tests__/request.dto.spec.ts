/**
 * ExecuteRequestOutput DTO Tests
 */

import { ExecuteRequestOutput } from '../request.dto';

describe('ExecuteRequestOutput', () => {
  it('should create from data object', () => {
    const data = {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: '{"test": "data"}',
      duration: 150
    };
    
    const output = ExecuteRequestOutput.from(data);
    
    expect(output.statusCode).toBe(200);
    expect(output.headers).toEqual({ 'content-type': 'application/json' });
    expect(output.body).toBe('{"test": "data"}');
    expect(output.duration).toBe(150);
  });

  it('should provide default values for optional fields', () => {
    const data = { statusCode: 404 };
    const output = new ExecuteRequestOutput(data);
    
    expect(output.statusCode).toBe(404);
    expect(output.headers).toEqual({});
    expect(output.body).toBe('');
    expect(output.duration).toBe(0);
  });

  it('should have readonly statusCode field', () => {
    const output = new ExecuteRequestOutput({ statusCode: 200 });
    expect(() => {
      (output as any).statusCode = 404;
    }).toThrow();
  });

  it('should have readonly headers field', () => {
    const output = new ExecuteRequestOutput({ statusCode: 200, headers: {} });
    expect(() => {
      (output as any).headers = {};
    }).toThrow();
  });

  it('should have readonly body field', () => {
    const output = new ExecuteRequestOutput({ statusCode: 200, body: 'test' });
    expect(() => {
      (output as any).body = 'modified';
    }).toThrow();
  });

  it('should have readonly duration field', () => {
    const output = new ExecuteRequestOutput({ statusCode: 200, duration: 100 });
    expect(() => {
      (output as any).duration = 200;
    }).toThrow();
  });

  it('should include optional scriptResults if provided', () => {
    const scriptResults = { assertions: [] };
    const data = { statusCode: 200, scriptResults };
    const output = new ExecuteRequestOutput(data);
    
    expect(output.scriptResults).toEqual(scriptResults);
  });

  it('should include optional cookies if provided', () => {
    const cookies = { sessionId: 'abc123' };
    const data = { statusCode: 200, cookies };
    const output = new ExecuteRequestOutput(data);
    
    expect(output.cookies).toEqual(cookies);
  });
});
