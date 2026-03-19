/**
 * ManageCookieOutput DTO Tests
 */

import { ManageCookieOutput } from '../cookie.dto';

describe('ManageCookieOutput', () => {
  it('should create from data object', () => {
    const cookies = [
      { name: 'session', value: 'abc123', domain: 'api.test' },
      { name: 'token', value: 'xyz789', domain: 'api.test' }
    ];
    const data = {
      success: true,
      message: 'Cookie added successfully',
      cookies
    };
    
    const output = ManageCookieOutput.from(data);
    
    expect(output.success).toBe(true);
    expect(output.message).toBe('Cookie added successfully');
    expect(output.cookies).toEqual(cookies);
    expect(output.count).toBe(2);
  });

  it('should calculate count from cookies array', () => {
    const output = new ManageCookieOutput({
      success: true,
      cookies: [{}, {}, {}]
    });
    
    expect(output.count).toBe(3);
  });

  it('should provide defaults for empty data', () => {
    const output = new ManageCookieOutput({});
    
    expect(output.success).toBe(false);
    expect(output.message).toBe('');
    expect(output.cookies).toEqual([]);
    expect(output.count).toBe(0);
  });

  it('should have readonly properties', () => {
    const output = new ManageCookieOutput({ success: true, cookies: [] });
    
    expect(() => {
      (output as any).success = false;
    }).toThrow();
    
    expect(() => {
      (output as any).count = 10;
    }).toThrow();
  });

  it('should be created via factory method', () => {
    const data = { success: true, message: 'OK', cookies: [] };
    const output = ManageCookieOutput.from(data);
    
    expect(output instanceof ManageCookieOutput).toBe(true);
  });
});
