/**
 * Handler Factory V2
 * 
 * Creates and configures all message handlers for the webview.
 * Implements factory pattern for dependency injection.
 */

import { ServiceContainer, ServiceIdentifiers } from '../../../infrastructure/services/service-container';
import { IMessageHandler } from '../interfaces/imessage-handler.interface';

// Import all handlers
import { CookieHandlerV2 } from './cookie-handler-v2';
import { EnvironmentConfigHandlerV2 } from './environment-config-handler-v2';
import { EnvironmentCrudHandlerV2 } from './environment-crud-handler-v2';
import { EnvironmentSelectionHandlerV2 } from './environment-selection-handler-v2';
import { ExecuteRequestHandlerV2 } from './execute-request-handler-v2';
import { GraphQLHandlerV2 } from './graphql-handler-v2';
import { HistoryHandlerV2 } from './history-handler-v2';
import { OAuth2HandlerV2 } from './oauth2-handler-v2';
import { SaveCollectionHandlerV2 } from './save-collection-handler-v2';
import { SaveFolderHandlerV2 } from './save-folder-handler-v2';
import { SaveRequestHandlerV2 } from './save-request-handler-v2';
import { SchemaHandlerV2 } from './schema-handler-v2';
import { TestSuiteHandlerV2 } from './test-suite-handler-v2';
import { UpdateCollectionHandlerV2 } from './update-collection-handler-v2';
import { VariableHandlerV2 } from './variable-handler-v2';

/**
 * Factory for creating and wiring all message handlers
 */
export class HandlerFactoryV2 {
  /**
   * Create all handlers with proper dependency injection
   * 
   * @param container Service container with registered dependencies
   * @returns Array of configured message handlers
   */
  static createHandlers(container: ServiceContainer): IMessageHandler[] {
    const logger = container.console;

    return [
      // ========== Request Tester Handlers ==========
      new ExecuteRequestHandlerV2(
        container.resolve(ServiceIdentifiers.ExecuteRequestCommand),
        logger as any
      ),
      new CookieHandlerV2(
        container.resolve(ServiceIdentifiers.ManageCookiesCommand),
        logger as any
      ),
      new HistoryHandlerV2(
        container.resolve(ServiceIdentifiers.ManageHistoryCommand),
        logger as any
      ),
      new VariableHandlerV2(
        container.resolve(ServiceIdentifiers.ManageVariablesCommand),
        logger as any
      ),

      // ========== Environment Handlers ==========
      new EnvironmentSelectionHandlerV2(
        container.resolve(ServiceIdentifiers.SelectEnvironmentCommand),
        logger as any
      ),
      new EnvironmentCrudHandlerV2(
        container.resolve(ServiceIdentifiers.ManageEnvironmentsCommand),
        logger as any
      ),
      new EnvironmentConfigHandlerV2(
        container.resolve(ServiceIdentifiers.ManageConfigCommand),
        logger as any
      ),

      // ========== Collection Handlers ==========
      new SaveCollectionHandlerV2(
        container.resolve(ServiceIdentifiers.SaveCollectionCommand),
        logger as any
      ),
      new UpdateCollectionHandlerV2(
        container.resolve(ServiceIdentifiers.UpdateCollectionCommand),
        logger as any
      ),

      // ========== Schema Handlers ==========
      new SchemaHandlerV2(
        container.resolve(ServiceIdentifiers.ManageSchemaCommand),
        logger as any
      ),

      // ========== OAuth2 Handler ==========
      new OAuth2HandlerV2(
        container.resolve(ServiceIdentifiers.ManageOAuth2Command),
        logger as any
      ),

      // ========== GraphQL Handler ==========
      new GraphQLHandlerV2(
        container.resolve(ServiceIdentifiers.ManageGraphQLCommand),
        logger as any
      ),

      // ========== Request Persistence Handler ==========
      new SaveRequestHandlerV2(
        container.resolve(ServiceIdentifiers.SaveRequestCommand),
        logger as any
      ),

      // ========== Test Suite Handler ==========
      new TestSuiteHandlerV2(
        container.resolve(ServiceIdentifiers.RunTestSuiteCommand),
        container.resolve(ServiceIdentifiers.SaveTestSuiteCommand),
        container.resolve(ServiceIdentifiers.ExportSuiteResultsCommand),
        container.resolve(ServiceIdentifiers.BrowseSuiteDataCommand),
        logger as any
      ),

      // ========== Folder Handler ==========
      new SaveFolderHandlerV2(
        container.resolve(ServiceIdentifiers.SaveFolderCommand),
        logger as any
      ),
    ];
  }
}
