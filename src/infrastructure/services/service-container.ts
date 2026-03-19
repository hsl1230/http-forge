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

  // ========== GENERATION #11: Application Layer Commands ==========
  // Request Commands
  ExecuteRequestCommand: Symbol.for('ExecuteRequestCommand'),
  SaveRequestCommand: Symbol.for('SaveRequestCommand'),
  ManageCookiesCommand: Symbol.for('ManageCookiesCommand'),
  ManageHistoryCommand: Symbol.for('ManageHistoryCommand'),
  ManageVariablesCommand: Symbol.for('ManageVariablesCommand'),

  // Environment Commands
  SelectEnvironmentCommand: Symbol.for('SelectEnvironmentCommand'),
  ManageEnvironmentsCommand: Symbol.for('ManageEnvironmentsCommand'),
  ManageConfigCommand: Symbol.for('ManageConfigCommand'),

  // Collection Commands
  SaveCollectionCommand: Symbol.for('SaveCollectionCommand'),
  UpdateCollectionCommand: Symbol.for('UpdateCollectionCommand'),

  // Suite Commands
  RunTestSuiteCommand: Symbol.for('RunTestSuiteCommand'),
  SaveTestSuiteCommand: Symbol.for('SaveTestSuiteCommand'),
  BrowseSuiteDataCommand: Symbol.for('BrowseSuiteDataCommand'),
  ExportSuiteResultsCommand: Symbol.for('ExportSuiteResultsCommand'),

  // Single-domain Commands
  SaveFolderCommand: Symbol.for('SaveFolderCommand'),
  ManageSchemaCommand: Symbol.for('ManageSchemaCommand'),
  ManageOAuth2Command: Symbol.for('ManageOAuth2Command'),
  ManageGraphQLCommand: Symbol.for('ManageGraphQLCommand'),

  // ========== GENERATION #11: Message Handlers ==========
  ExecuteRequestHandlerV2: Symbol.for('ExecuteRequestHandlerV2'),
  CookieHandlerV2: Symbol.for('CookieHandlerV2'),
  HistoryHandlerV2: Symbol.for('HistoryHandlerV2'),
  EnvironmentSelectionHandlerV2: Symbol.for('EnvironmentSelectionHandlerV2'),
  VariableHandlerV2: Symbol.for('VariableHandlerV2'),
  GraphQLHandlerV2: Symbol.for('GraphQLHandlerV2'),
  SchemaHandlerV2: Symbol.for('SchemaHandlerV2'),
  OAuth2HandlerV2: Symbol.for('OAuth2HandlerV2'),
  SaveRequestHandlerV2: Symbol.for('SaveRequestHandlerV2'),
  EnvironmentCrudHandlerV2: Symbol.for('EnvironmentCrudHandlerV2'),
  EnvironmentConfigHandlerV2: Symbol.for('EnvironmentConfigHandlerV2'),
  SaveCollectionHandlerV2: Symbol.for('SaveCollectionHandlerV2'),
  UpdateCollectionHandlerV2: Symbol.for('UpdateCollectionHandlerV2'),
  TestSuiteHandlerV2: Symbol.for('TestSuiteHandlerV2'),
  SaveFolderHandlerV2: Symbol.for('SaveFolderHandlerV2'),

  // ========== GENERATION #11: Model Loaders ==========
  CollectionsModelLoader: Symbol.for('CollectionsModelLoader'),
  EnvironmentsModelLoader: Symbol.for('EnvironmentsModelLoader'),
  TestSuitesModelLoader: Symbol.for('TestSuitesModelLoader'),

  // ========== GENERATION #11: Tree Providers ==========
  CollectionsTreeProviderV2: Symbol.for('CollectionsTreeProviderV2'),
  EnvironmentsTreeProviderV2: Symbol.for('EnvironmentsTreeProviderV2'),
  TestSuitesTreeProviderV2: Symbol.for('TestSuitesTreeProviderV2'),

  // ========== GENERATION #11: Orchestrators ==========
  RequestOrchestrator: Symbol.for('RequestOrchestrator'),
  EnvironmentOrchestrator: Symbol.for('EnvironmentOrchestrator'),
  CollectionOrchestrator: Symbol.for('CollectionOrchestrator'),
  TestSuiteOrchestrator: Symbol.for('TestSuiteOrchestrator'),
  FolderOrchestrator: Symbol.for('FolderOrchestrator'),
  SchemaOrchestrator: Symbol.for('SchemaOrchestrator'),
  OAuth2Orchestrator: Symbol.for('OAuth2Orchestrator'),
  GraphQLOrchestrator: Symbol.for('GraphQLOrchestrator'),

  // ========== GENERATION #11: Event Bus ==========
  EventBus: Symbol.for('EventBus'),
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
