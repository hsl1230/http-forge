/**
 * Schema Handler
 * 
 * Handles schema-related webview messages for the Request Tester panel.
 * Single Responsibility: Manages body schema and response schema operations
 * including get, save, infer, validate, capture, and example generation.
 */

import { type BodySchemaDefinition, ExampleGenerator, ICollectionService, type ISchemaInferenceService, type ResponseSchemaDefinition, SchemaInferrer } from '@http-forge/core';
import { IMessageHandler, IWebviewMessenger } from '../../shared-interfaces';
import { IPanelContextProvider } from '../interfaces';

/**
 * Handles body/response schema commands from the webview.
 * 
 * Supported commands:
 * - getBodySchema / getResponseSchema: load stored schemas
 * - saveBodySchema / saveResponseSchema: persist edited schemas
 * - inferBodySchema / inferResponseSchema: run inference pipeline
 * - validateBody: validate current body against schema
 * - captureResponse: infer schema from the last captured response
 * - generateExampleBody / generateExampleResponse: generate examples from schemas
 */
export class SchemaHandler implements IMessageHandler {
    private exampleGenerator: ExampleGenerator;
    private schemaInferrer: SchemaInferrer;

    constructor(
        private contextProvider: IPanelContextProvider,
        private collectionService: ICollectionService,
        private schemaInferenceService: ISchemaInferenceService
    ) {
        this.exampleGenerator = new ExampleGenerator();
        this.schemaInferrer = new SchemaInferrer();
    }

    getSupportedCommands(): string[] {
        return [
            'getBodySchema',
            'getResponseSchema',
            'saveBodySchema',
            'saveResponseSchema',
            'inferBodySchema',
            'inferResponseSchema',
            'validateBody',
            'captureResponse',
            'generateExampleBody',
            'generateExampleResponse'
        ];
    }

    async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
        switch (command) {
            case 'getBodySchema':
                await this.handleGetBodySchema(message, messenger);
                return true;
            case 'getResponseSchema':
                await this.handleGetResponseSchema(message, messenger);
                return true;
            case 'saveBodySchema':
                await this.handleSaveBodySchema(message, messenger);
                return true;
            case 'saveResponseSchema':
                await this.handleSaveResponseSchema(message, messenger);
                return true;
            case 'inferBodySchema':
                await this.handleInferBodySchema(message, messenger);
                return true;
            case 'inferResponseSchema':
                await this.handleInferResponseSchema(message, messenger);
                return true;
            case 'validateBody':
                await this.handleValidateBody(message, messenger);
                return true;
            case 'captureResponse':
                await this.handleCaptureResponse(message, messenger);
                return true;
            case 'generateExampleBody':
                await this.handleGenerateExampleBody(message, messenger);
                return true;
            case 'generateExampleResponse':
                await this.handleGenerateExampleResponse(message, messenger);
                return true;
            default:
                return false;
        }
    }

    // ========================================
    // Get / Load handlers
    // ========================================

    private async handleGetBodySchema(message: any, messenger: IWebviewMessenger): Promise<void> {
        const { collectionId, requestId } = message;
        const request = this.findRequest(collectionId, requestId);
        messenger.postMessage({
            command: 'bodySchemaLoaded',
            schema: request?.bodySchema ?? null
        });
    }

    private async handleGetResponseSchema(message: any, messenger: IWebviewMessenger): Promise<void> {
        const { collectionId, requestId } = message;
        const request = this.findRequest(collectionId, requestId);
        messenger.postMessage({
            command: 'responseSchemaLoaded',
            schema: request?.responseSchema ?? null
        });
    }

    // ========================================
    // Save handlers
    // ========================================

    private async handleSaveBodySchema(message: any, messenger: IWebviewMessenger): Promise<void> {
        const { collectionId, requestId, schema } = message;
        try {
            await this.collectionService.updateRequest(collectionId, requestId, {
                bodySchema: schema as BodySchemaDefinition
            } as any);
            messenger.postMessage({ command: 'bodySchemaSaved' });
        } catch (error: any) {
            console.error('[SchemaHandler] Save body schema failed:', error);
            messenger.postMessage({
                command: 'bodySchemaLoaded',
                schema: null,
                error: error.message
            });
        }
    }

    private async handleSaveResponseSchema(message: any, messenger: IWebviewMessenger): Promise<void> {
        const { collectionId, requestId, schema } = message;
        try {
            await this.collectionService.updateRequest(collectionId, requestId, {
                responseSchema: schema as ResponseSchemaDefinition
            } as any);
            messenger.postMessage({ command: 'responseSchemaSaved' });
        } catch (error: any) {
            console.error('[SchemaHandler] Save response schema failed:', error);
            messenger.postMessage({
                command: 'responseSchemaLoaded',
                schema: null,
                error: error.message
            });
        }
    }

    // ========================================
    // Infer handlers
    // ========================================

    private async handleInferBodySchema(message: any, messenger: IWebviewMessenger): Promise<void> {
        const { collectionId, requestId } = message;
        try {
            const request = this.findRequest(collectionId, requestId);

            // Priority: sentBody (variables resolved) > live body from editor > saved request body
            const body = message.sentBody || message.body || (request?.body);
            let bodyContent: any;
            let bodyType: string | undefined;
            let bodyFormat: string | undefined;
            let formDataEntries: any[] | undefined;

            if (body && typeof body === 'object' && 'type' in body) {
                bodyType = body.type;
                bodyFormat = body.format;
                bodyContent = body.content;

                if (bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded') {
                    formDataEntries = Array.isArray(body.content) ? body.content : [];
                }
            }

            if (!bodyContent && bodyType !== 'form-data' && bodyType !== 'x-www-form-urlencoded') {
                messenger.postMessage({ command: 'bodySchemaInferred', schema: null });
                return;
            }

            const schema = await this.schemaInferenceService.inferBodySchema(
                bodyType === 'raw' && bodyFormat === 'json' && typeof bodyContent === 'string'
                    ? this.resolveVariablePlaceholders(bodyContent)
                    : bodyContent,
                bodyType,
                bodyFormat,
                formDataEntries,
                request?.bodySchema
            );

            messenger.postMessage({ command: 'bodySchemaInferred', schema: schema ?? null });
        } catch (error: any) {
            console.error('[SchemaHandler] Infer body schema failed:', error);
            messenger.postMessage({ command: 'bodySchemaInferred', schema: null });
        }
    }

    private async handleInferResponseSchema(message: any, messenger: IWebviewMessenger): Promise<void> {
        const { collectionId, requestId } = message;
        try {
            const request = this.findRequest(collectionId, requestId);

            // Use contextProvider to get the correct history storage path
            // (includes full requestPath with folder path, and actual environment)
            const historyPath = this.contextProvider.getHistoryStoragePath();
            const inferCollectionId = historyPath?.requestPath || collectionId;
            const inferRequestId = historyPath?.requestId || requestId;
            const environment = historyPath?.environment;

            const schema = await this.schemaInferenceService.infer(
                inferCollectionId,
                inferRequestId,
                request?.responseSchema,
                {
                    environment,
                    postResponseScript: request?.scripts?.postResponse
                }
            );
            messenger.postMessage({ command: 'responseSchemaInferred', schema });
        } catch (error: any) {
            console.error('[SchemaHandler] Infer response schema failed:', error);
            messenger.postMessage({ command: 'responseSchemaInferred', schema: null });
        }
    }

    // ========================================
    // Validate handler
    // ========================================

    private async handleValidateBody(message: any, messenger: IWebviewMessenger): Promise<void> {
        const { collectionId, requestId } = message;
        try {
            const request = this.findRequest(collectionId, requestId);
            if (!request?.bodySchema?.schema) {
                messenger.postMessage({
                    command: 'bodyValidationResult',
                    valid: false,
                    errors: [{ message: 'No body schema defined' }]
                });
                return;
            }

            // Priority: sentBody (variables resolved) > live body from editor > saved request body
            const body = message.sentBody || message.body || (request?.body);
            let parsedBody: any;
            if (body && typeof body === 'object' && 'type' in body) {
                if (body.type === 'raw' && body.format === 'json') {
                    try {
                        // Resolve {{variable}} placeholders before parsing
                        const content = typeof body.content === 'string'
                            ? this.resolveVariablePlaceholders(body.content)
                            : body.content;
                        parsedBody = typeof content === 'string' ? JSON.parse(content) : content;
                    } catch {
                        messenger.postMessage({
                            command: 'bodyValidationResult',
                            valid: false,
                            errors: [{ message: 'Body is not valid JSON (even after resolving variables)' }]
                        });
                        return;
                    }
                }
            }

            if (parsedBody === undefined) {
                messenger.postMessage({
                    command: 'bodyValidationResult',
                    valid: false,
                    errors: [{ message: 'Cannot validate non-JSON body' }]
                });
                return;
            }

            // Simple JSON schema validation (check required fields and types)
            const errors = this.validateAgainstSchema(parsedBody, request.bodySchema.schema);
            messenger.postMessage({
                command: 'bodyValidationResult',
                valid: errors.length === 0,
                errors
            });
        } catch (error: any) {
            console.error('[SchemaHandler] Validate body failed:', error);
            messenger.postMessage({
                command: 'bodyValidationResult',
                valid: false,
                errors: [{ message: error.message }]
            });
        }
    }

    // ========================================
    // Capture response handler
    // ========================================

    private async handleCaptureResponse(message: any, messenger: IWebviewMessenger): Promise<void> {
        const { collectionId, requestId, response } = message;
        try {
            if (!response || !response.statusCode) {
                messenger.postMessage({ command: 'responseSchemaInferred', schema: null });
                return;
            }

            const request = this.findRequest(collectionId, requestId);
            const existingSchema = request?.responseSchema || { responses: {} };
            const statusCode = String(response.statusCode);

            // Infer schema from the response body
            let bodyParsed: any;
            if (response.body) {
                try {
                    bodyParsed = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
                } catch {
                    // Non-JSON response — use string schema
                    bodyParsed = undefined;
                }
            }

            const inferredSchema = bodyParsed
                ? this.schemaInferrer.inferFromValue(bodyParsed)
                : { type: 'string' as const };

            // Determine content type from response headers
            let contentType = 'application/json';
            if (response.headers) {
                const ctHeader = Object.entries(response.headers).find(
                    ([k]) => k.toLowerCase() === 'content-type'
                );
                if (ctHeader) {
                    contentType = String(ctHeader[1]).split(';')[0].trim();
                }
            }

            // Merge into existing schema
            const updatedSchema: ResponseSchemaDefinition = {
                ...existingSchema,
                responses: {
                    ...existingSchema.responses,
                    [statusCode]: {
                        ...(existingSchema.responses[statusCode] || {}),
                        contentType,
                        schema: inferredSchema
                    }
                }
            };

            messenger.postMessage({ command: 'responseSchemaInferred', schema: updatedSchema });
        } catch (error: any) {
            console.error('[SchemaHandler] Capture response failed:', error);
            messenger.postMessage({ command: 'responseSchemaInferred', schema: null });
        }
    }

    // ========================================
    // Example generation handlers
    // ========================================

    private async handleGenerateExampleBody(message: any, messenger: IWebviewMessenger): Promise<void> {
        const { collectionId, requestId } = message;
        try {
            // Priority: schema sent from the webview editor tab → findRequest lookup
            const bodySchema = message.bodySchema ?? this.findRequest(collectionId, requestId)?.bodySchema;
            if (!bodySchema?.schema) {
                messenger.postMessage({ command: 'exampleBodyGenerated', example: null });
                return;
            }

            const example = this.exampleGenerator.generate(bodySchema.schema, {
                components: bodySchema.components
            });

            messenger.postMessage({
                command: 'exampleBodyGenerated',
                example: example !== undefined ? JSON.stringify(example, null, 2) : null
            });
        } catch (error: any) {
            console.error('[SchemaHandler] Generate example body failed:', error);
            messenger.postMessage({ command: 'exampleBodyGenerated', example: null });
        }
    }

    private async handleGenerateExampleResponse(message: any, messenger: IWebviewMessenger): Promise<void> {
        const { collectionId, requestId } = message;
        try {
            // Priority: schema sent from the webview editor tab → findRequest lookup
            const responseSchema = message.responseSchema ?? this.findRequest(collectionId, requestId)?.responseSchema;
            if (!responseSchema?.responses) {
                messenger.postMessage({ command: 'exampleBodyGenerated', example: null });
                return;
            }

            // Use the status code sent by the webview (active tab), fall back to 200 or first
            const statusCodes = Object.keys(responseSchema.responses);
            let targetCode = message.statusCode;
            if (!targetCode || !statusCodes.includes(targetCode)) {
                targetCode = statusCodes.includes('200') ? '200' : statusCodes[0];
            }
            if (!targetCode) {
                messenger.postMessage({ command: 'exampleBodyGenerated', example: null });
                return;
            }

            const responseDef = responseSchema.responses[targetCode];
            if (!responseDef?.schema) {
                messenger.postMessage({ command: 'exampleBodyGenerated', example: null });
                return;
            }

            const example = this.exampleGenerator.generate(responseDef.schema, {
                components: responseSchema.components
            });

            messenger.postMessage({
                command: 'exampleBodyGenerated',
                example: example !== undefined ? JSON.stringify(example, null, 2) : null
            });
        } catch (error: any) {
            console.error('[SchemaHandler] Generate example response failed:', error);
            messenger.postMessage({ command: 'exampleBodyGenerated', example: null });
        }
    }

    // ========================================
    // Utility methods
    // ========================================

    /**
     * Replace {{variable}} placeholders with type-appropriate dummy values
     * so the JSON can be parsed for schema inference.
     * 
     * Handles placeholders in:
     *   - string values:  "name": "{{var}}"  → "name": "placeholder"
     *   - bare values:    "count": {{var}}   → "count": "placeholder"
     *   - mixed strings:  "url": "https://{{host}}/path" → "url": "https://placeholder/path"
     */
    private resolveVariablePlaceholders(content: string): string {
        if (!content || typeof content !== 'string') return content;

        // Step 1: Replace {{...}} that appear as bare (unquoted) JSON values
        // e.g.  "count": {{num}}  →  "count": "placeholder"
        let resolved = content.replace(
            /:\s*\{\{[^}]*\}\}/g,
            ': "placeholder"'
        );

        // Step 2: Replace remaining {{...}} inside quoted strings
        // e.g.  "{{var}}" or "prefix-{{var}}-suffix"
        resolved = resolved.replace(/\{\{[^}]*\}\}/g, 'placeholder');

        return resolved;
    }

    /**
     * Find a request in collection by IDs.
     * Falls back to the in-memory request context when the collection
     * lookup fails (e.g. for ad-hoc / unsaved requests opened via
     * openRequestContext from external extensions like Spring API Tester).
     *
     * When a collection item is found, its schema fields may be stale or
     * absent if the request was saved before schemas were generated.
     * In that case we merge schema data from the in-memory context so
     * callers always get the freshest available information.
     */
    private findRequest(collectionId: string, requestId: string): any | undefined {
        const contextRequest = this.contextProvider.getCurrentContext()?.request;

        if (collectionId && requestId) {
            const item = this.collectionService.findRequest(collectionId, requestId);
            if (item) {
                // Merge schema fields from context when the saved item lacks them
                if (contextRequest) {
                    if (!item.bodySchema && contextRequest.bodySchema) {
                        item.bodySchema = contextRequest.bodySchema;
                    }
                    if (!item.responseSchema && contextRequest.responseSchema) {
                        item.responseSchema = contextRequest.responseSchema;
                    }
                }
                return item;
            }
        }
        // Fallback: use the current panel context's request object
        return contextRequest;
    }

    /**
     * Simple JSON schema validation
     * Returns an array of error objects for any violations
     */
    private validateAgainstSchema(value: any, schema: any): Array<{ message: string; path?: string }> {
        const errors: Array<{ message: string; path?: string }> = [];

        if (!schema) return errors;

        // Type check
        if (schema.type) {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            const expectedType = schema.type;

            if (expectedType === 'integer') {
                if (typeof value !== 'number' || !Number.isInteger(value)) {
                    errors.push({ message: `Expected integer, got ${actualType}` });
                }
            } else if (expectedType === 'number') {
                if (typeof value !== 'number') {
                    errors.push({ message: `Expected number, got ${actualType}` });
                }
            } else if (actualType !== expectedType) {
                errors.push({ message: `Expected ${expectedType}, got ${actualType}` });
            }
        }

        // Required fields check (for objects)
        if (schema.type === 'object' && schema.required && typeof value === 'object' && value !== null) {
            for (const field of schema.required) {
                if (!(field in value)) {
                    errors.push({ message: `Missing required field: ${field}`, path: field });
                }
            }
        }

        // Enum check
        if (schema.enum && !schema.enum.includes(value)) {
            errors.push({ message: `Value must be one of: ${schema.enum.join(', ')}` });
        }

        // Properties check for objects
        if (schema.type === 'object' && schema.properties && typeof value === 'object' && value !== null) {
            for (const [propName, propSchema] of Object.entries(schema.properties)) {
                if (propName in value) {
                    const propErrors = this.validateAgainstSchema(value[propName], propSchema);
                    for (const err of propErrors) {
                        errors.push({
                            message: err.message,
                            path: err.path ? `${propName}.${err.path}` : propName
                        });
                    }
                }
            }
        }

        // Array items check
        if (schema.type === 'array' && schema.items && Array.isArray(value)) {
            value.forEach((item: any, index: number) => {
                const itemErrors = this.validateAgainstSchema(item, schema.items);
                for (const err of itemErrors) {
                    errors.push({
                        message: err.message,
                        path: err.path ? `[${index}].${err.path}` : `[${index}]`
                    });
                }
            });
        }

        return errors;
    }
}
