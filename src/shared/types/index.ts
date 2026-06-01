/**
 * Extension-only types for HTTP Forge
 * 
 * UIRequest, HttpResponse, ExecutionResult live here because they differ
 * slightly from the core equivalents (e.g. dual-format headers, Buffer body).
 * All other shared types should be imported directly from @http-forge/core.
 */

import type {
    BodySchemaDefinition,
    JsonValue,
    KeyValueEntry,
    ParsedCookie,
    PathParamEntry,
    PreparedRequest,
    RequestAuth,
    RequestBody,
    RequestScripts,
    RequestSettings,
    ResponseSchemaDefinition,
    TestAssertion,
} from '@http-forge/core';

// ============================================
// Extension-only types
// ============================================

/**
 * Request sent/received from webview
 * 
 * Characteristics:
 * - Headers and query can be Record format (execution) or KeyValueEntry[] (save with metadata)
 * - All fields optional (handles partial data)
 * - Used for Request Tester and collection operations
 * 
 * Format notes:
 * - Execution path sends Record<string, string> for headers/query/params (request-builder.js)
 * - Save path sends KeyValueEntry[] for headers/query to preserve OpenAPI metadata (request-saver.js)
 */
export interface UIRequest {
    // Identification (optional for new requests)
    id?: string;
    name?: string;
    
    // Request details (path or url, method)
    path?: string;  // Can be full URL or path
    url?: string;   // Alternative to path
    method?: string;
    
    // Request data — dual format: Record (execution) or KeyValueEntry[] (save with metadata)
    headers?: Record<string, string> | KeyValueEntry[];
    query?: Record<string, string> | KeyValueEntry[];
    body?: RequestBody | null;
    bodyContentType?: string;
    
    // Path parameters — supports PathParamEntry for OpenAPI metadata
    params?: Record<string, string | PathParamEntry>;
    
    // Configuration
    settings?: RequestSettings;
    scripts?: RequestScripts;
    
    // Authentication
    auth?: RequestAuth;
    
    // Collection context
    collectionId?: string;
    requestId?: string;
    folderPath?: string;
    
    // Metadata
    readonly?: boolean;
    saveResponse?: boolean;
    description?: string;
    doc?: string;
    disabled?: boolean;
    
    // OpenAPI metadata (preserved through save round-trip)
    deprecated?: boolean;
    responseSchema?: ResponseSchemaDefinition;
    bodySchema?: BodySchemaDefinition;
}

// ============================================
// Extension-only: HttpResponse
// (Aligned with core: cookies is ParsedCookie[])
// ============================================

/**
 * HTTP response from server
 */
export interface HttpResponse {
    status: number;
    statusText: string;
    headers: Record<string, string | string[]>;
    body: JsonValue | string | Buffer | null;
    time: number;
    size?: number;
    cookies: ParsedCookie[];
}

/**
 * Result from executing a request
 * 
 * Kept local because it references extension's HttpResponse type.
 */
export interface ExecutionResult {
    // Identification
    requestId: string;
    name: string;
    
    // EMBEDDED: What was sent (RESOLVED) - no field mapping needed!
    executedRequest: PreparedRequest;
    
    // EMBEDDED: What was received - no field mapping needed!
    response: HttpResponse;
    
    // Timing
    duration: number;
    timestamp: number;
    
    // Execution results
    passed: boolean;
    assertions: TestAssertion[];
    consoleOutput?: string[];
    
    // Variables (modified by scripts)
    modifiedVariables?: Record<string, string>;
    modifiedEnvironmentVariables?: Record<string, string>;
    modifiedCollectionVariables?: Record<string, string>;
    modifiedSessionVariables?: Record<string, string>;
    
    // Flow control (pm.execution.setNextRequest / pm.setNextRequest)
    nextRequest?: string | null;

    // Visualizer (pm.visualizer.set)
    visualizerData?: { template: string; data?: any };

    // Errors
    error?: string;
}
