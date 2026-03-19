/**
 * Environment Editor Interfaces
 * 
 * Following SOLID principles:
 * - Interface Segregation: Small, focused interfaces
 * - Dependency Inversion: Handlers depend on abstractions
 * 
 * This file consolidates all interfaces used by the Environment Editor components.
 */

// ============================================
// Environment Editor Specific Interfaces
// ============================================

/**
 * Environment configuration data
 */
export interface EnvironmentConfig {
    variables: Record<string, string>;
    inherit?: string;
}

/**
 * Shared configuration structure
 */
export interface SharedConfig {
    version?: string;
    defaultEnvironment?: string;
    globals?: Record<string, string>;
    environments: Record<string, EnvironmentConfig>;
}

/**
 * Local configuration structure
 */
export interface LocalConfig {
    selectedEnvironment?: string;
    overrides?: Record<string, Record<string, string>>;
    secrets?: Record<string, string>;
}

/**
 * Initial data sent to webview
 */
export interface InitialData {
    sharedConfig: SharedConfig | null;
    localConfig: LocalConfig | null;
    hasLocalConfig: boolean;
    selectedEnvironment?: string;
}

/**
 * Config save result message
 */
export interface SaveResultMessage {
    type: 'saveSuccess' | 'saveError';
    configType: 'shared' | 'local';
    error?: string;
}

/**
 * Interface for environment config service operations
 * Dependency Inversion: Handlers depend on this abstraction
 */
export interface IEnvironmentConfigProvider {
    getSharedConfig(): SharedConfig | null;
    getLocalConfig(): LocalConfig | null;
    saveSharedConfig(config: SharedConfig): void;
    saveLocalConfig(config: LocalConfig): void;
    getSharedConfigPath(): string;
    getLocalConfigPath(): string;
}
