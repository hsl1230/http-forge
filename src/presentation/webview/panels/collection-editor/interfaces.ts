/**
 * Collection Editor Interfaces
 * 
 * Following SOLID principles:
 * - Interface Segregation: Small, focused interfaces
 * - Dependency Inversion: Handlers depend on abstractions
 */

// ============================================
// Collection Editor Specific Interfaces
// ============================================

/**
 * Collection authentication configuration
 */
export interface CollectionAuth {
    type: 'none' | 'inherit' | 'bearer' | 'basic' | 'apikey';
    token?: string;
    username?: string;
    password?: string;
    key?: string;
    value?: string;
    in?: 'header' | 'query';
}

/**
 * Collection scripts (pre-request and post-response)
 */
export interface CollectionScripts {
    preRequest?: string;
    postResponse?: string;
}

/**
 * Collection metadata for editing
 */
export interface CollectionMetadata {
    id: string;
    name: string;
    description?: string;
    variables?: Record<string, string>;
    auth?: CollectionAuth;
    scripts?: CollectionScripts;
    items?: any[];
}

/**
 * Partial collection update
 */
export interface CollectionUpdate {
    name?: string;
    description?: string;
    variables?: Record<string, string>;
    auth?: CollectionAuth;
    scripts?: CollectionScripts;
}
