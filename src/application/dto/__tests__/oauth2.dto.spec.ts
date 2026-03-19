/**
 * OAuth2 DTO Tests
 */

import { ManageOAuth2Output } from '../oauth2.dto';

describe('ManageOAuth2Output', () => {
  it('should create from data object', () => {
    const expiresAt = Date.now() + 3600000;
    const data = {
      success: true,
      message: 'Token acquired',
      accessToken: 'token-abc123',
      refreshToken: 'refresh-xyz789',
      tokenType: 'Bearer',
      expiresAt,
      expiresIn: 3600,
      scope: 'read write'
    };
    
    const output = ManageOAuth2Output.from(data);
    
    expect(output.accessToken).toBe('token-abc123');
    expect(output.tokenType).toBe('Bearer');
    expect(output.expiresAt).toBe(expiresAt);
  });

  it('should check if token is expired', () => {
    const expiredAt = Date.now() - 1000;
    const output = new ManageOAuth2Output({ expiresAt: expiredAt });
    
    expect(output.isExpired()).toBe(true);
  });

  it('should check if token is not expired', () => {
    const futureTime = Date.now() + 3600000;
    const output = new ManageOAuth2Output({ expiresAt: futureTime });
    
    expect(output.isExpired()).toBe(false);
  });

  it('should calculate time until expiration', () => {
    const futureTime = Date.now() + 3600000;
    const output = new ManageOAuth2Output({ expiresAt: futureTime });
    const timeRemaining = output.getTimeUntilExpiration();
    
    expect(timeRemaining).toBeGreaterThan(3590);
    expect(timeRemaining).toBeLessThanOrEqual(3600);
  });

  it('should return 0 for expired token time', () => {
    const expiredAt = Date.now() - 1000;
    const output = new ManageOAuth2Output({ expiresAt: expiredAt });
    
    expect(output.getTimeUntilExpiration()).toBe(0);
  });
});
