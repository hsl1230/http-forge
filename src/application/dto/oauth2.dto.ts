/**
 * OAuth2 Management DTOs
 * 
 * Data transfer objects for managing OAuth2 authentication in the application layer.
 * Handles OAuth2 configuration, token acquisition, refresh, and revocation.
 */

/**
 * Input DTO for OAuth2 management operations
 */
export interface ManageOAuth2Input {
  /**
   * Operation type: 'authorize', 'refresh', 'revoke', 'clear'
   */
  operation: 'authorize' | 'refresh' | 'revoke' | 'clear';

  /**
   * OAuth2 configuration
   */
  config?: {
    clientId?: string;
    clientSecret?: string;
    authorizationUrl?: string;
    tokenUrl?: string;
    redirectUrl?: string;
    scope?: string[];
    state?: string;
  };

  /**
   * Current credentials
   */
  credentials?: {
    accessToken?: string;
    refreshToken?: string;
    tokenType?: string;
  };

  /**
   * Request body parameters
   */
  requestBody?: Record<string, any>;
}

/**
 * Output DTO for OAuth2 management operations
 */
export class ManageOAuth2Output {
  /**
   * Whether operation was successful
   */
  readonly success: boolean;

  /**
   * Result message
   */
  readonly message: string;

  /**
   * Access token
   */
  readonly accessToken?: string;

  /**
   * Refresh token
   */
  readonly refreshToken?: string;

  /**
   * Token type (typically 'Bearer')
   */
  readonly tokenType: string;

  /**
   * Token expiration time (Unix timestamp)
   */
  readonly expiresAt?: number;

  /**
   * Token expiration in seconds
   */
  readonly expiresIn?: number;

  /**
   * Scope
   */
  readonly scope?: string;

  /**
   * Additional response data
   */
  readonly extra?: Record<string, any>;

  constructor(data: any) {
    this.success = data.success || false;
    this.message = data.message || '';
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    this.tokenType = data.tokenType || 'Bearer';
    this.expiresAt = data.expiresAt;
    this.expiresIn = data.expiresIn;
    this.scope = data.scope;
    this.extra = data.extra;
  }

  /**
   * Check if token is expired
   * @returns True if token is expired
   */
  isExpired(): boolean {
    if (!this.expiresAt) {
      return false;
    }
    return Date.now() > this.expiresAt;
  }

  /**
   * Get time until expiration in seconds
   * @returns Seconds until expiration, or 0 if expired or no expiration
   */
  getTimeUntilExpiration(): number {
    if (!this.expiresAt) {
      return 0;
    }
    const remaining = Math.floor((this.expiresAt - Date.now()) / 1000);
    return Math.max(0, remaining);
  }

  /**
   * Factory method to create ManageOAuth2Output from raw data
   * @param data Raw operation result
   * @returns ManageOAuth2Output instance
   */
  static from(data: any): ManageOAuth2Output {
    return new ManageOAuth2Output(data);
  }
}
