/**
 * Service Container for HTTP Forge Extension
 * 
 * Re-exports the platform-agnostic ServiceContainer and ServiceIdentifiers
 * from @http-forge/core, and adds one extension-specific identifier.
 */

import {
  ServiceContainer as CoreServiceContainer,
  ServiceIdentifiers as CoreServiceIdentifiers,
  getServiceContainer as coreGetServiceContainer,
} from '@http-forge/core';

/**
 * Service identifiers — extends core identifiers with VS Code-specific ones
 */
export const ServiceIdentifiers = {
  ...CoreServiceIdentifiers,
  /** VS Code ExtensionContext — extension-only, not in core */
  ExtensionContext: Symbol.for('ExtensionContext'),
} as const;

/**
 * Re-export ServiceContainer from core
 */
export const ServiceContainer = CoreServiceContainer;
export type ServiceContainer = CoreServiceContainer;

/**
 * Convenience function to get the service container instance
 */
export function getServiceContainer(): CoreServiceContainer {
  return coreGetServiceContainer();
}
