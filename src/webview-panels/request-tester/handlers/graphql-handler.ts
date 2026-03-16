/**
 * GraphQL Handler
 * 
 * Single Responsibility: Handle GraphQL-related webview messages
 * 
 * Commands:
 *  - graphqlFetchSchema      (webview → ext) — trigger introspection query
 *  - graphqlGetCompletions   (webview → ext) — get completions for cursor position
 *  - graphqlClearSchemaCache (webview → ext) — clear cached schema
 * 
 * Responses:
 *  - graphqlSchemaReceived   (ext → webview) — schema fetched successfully
 *  - graphqlSchemaError      (ext → webview) — introspection failed
 *  - graphqlCompletions      (ext → webview) — completion items
 */

import {
    getCompletions,
    GraphQLSchemaService,
    type IGraphQLSchemaService,
    type IHttpClient,
    parseQueryContext
} from '@http-forge/core';
import { IMessageHandler, IWebviewMessenger } from '../../shared-interfaces';

export class GraphQLHandler implements IMessageHandler {
    private schemaService: IGraphQLSchemaService;

    constructor(
        httpClient: IHttpClient,
    ) {
        this.schemaService = new GraphQLSchemaService(httpClient);
    }

    getSupportedCommands(): string[] {
        return ['graphqlFetchSchema', 'graphqlGetCompletions', 'graphqlClearSchemaCache'];
    }

    async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
        switch (command) {
            case 'graphqlFetchSchema':
                await this.handleFetchSchema(message, messenger);
                return true;

            case 'graphqlGetCompletions':
                await this.handleGetCompletions(message, messenger);
                return true;

            case 'graphqlClearSchemaCache':
                this.schemaService.clearCache(message.endpointUrl);
                messenger.postMessage({ command: 'graphqlSchemaCacheCleared' });
                return true;

            default:
                return false;
        }
    }

    // ─── Private handlers ──────────────────────────────

    private async handleFetchSchema(message: any, messenger: IWebviewMessenger): Promise<void> {
        try {
            const { endpointUrl, headers } = message;

            if (!endpointUrl) {
                throw new Error('No endpoint URL provided. Enter a GraphQL endpoint URL first.');
            }

            const schema = await this.schemaService.fetchSchema(endpointUrl, headers || {});

            // Convert schema to serializable format for webview
            const serializable = this.schemaService.schemaToSerializable(schema);

            messenger.postMessage({
                command: 'graphqlSchemaReceived',
                schema: serializable,
                endpointUrl,
                typeCount: schema.types.size,
                hasQuery: !!schema.queryType,
                hasMutation: !!schema.mutationType,
                hasSubscription: !!schema.subscriptionType
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            messenger.postMessage({
                command: 'graphqlSchemaError',
                error: errorMessage
            });
        }
    }

    private async handleGetCompletions(message: any, messenger: IWebviewMessenger): Promise<void> {
        try {
            const { endpointUrl, document: gqlDocument, offset } = message;

            if (!endpointUrl) {
                messenger.postMessage({ command: 'graphqlCompletions', items: [] });
                return;
            }

            const schema = this.schemaService.getCachedSchema(endpointUrl);
            if (!schema) {
                messenger.postMessage({ command: 'graphqlCompletions', items: [] });
                return;
            }

            const context = parseQueryContext(gqlDocument || '', offset || 0, schema);
            const items = getCompletions(schema, context);

            messenger.postMessage({
                command: 'graphqlCompletions',
                items,
                context: context.contextType
            });
        } catch (error: unknown) {
            messenger.postMessage({ command: 'graphqlCompletions', items: [] });
        }
    }
}
