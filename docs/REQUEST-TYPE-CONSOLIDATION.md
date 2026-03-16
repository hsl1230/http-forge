# Request Type Consolidation Solution

## Executive Summary

This document describes the solution for consolidating the fragmented request types in HTTP Forge. The goal is to reduce **10+ overlapping request types** to **4 canonical types** with clear layer boundaries, improving code clarity and maintainability.

**Key Principles:**
- **Strong typing everywhere** - No `any` type usage
- **Clear variable resolution state** - Each type indicates if variables are resolved or not
- **pm.request consistency** - Pre-request uses `ExecutionRequest`, post-response uses `ExecutionResult.executedRequest`
- **Embedded types** - `PreparedRequest` and `HttpResponse` are embedded in `ExecutionResult` to avoid field mapping

---

## Problem Statement

### Current State: Type Fragmentation

The codebase has accumulated multiple request-related types that represent similar concepts:

| Type | Location | Headers/Query Format | Purpose |
|------|----------|---------------------|---------|
| `CollectionRequest` | `src/services/request-execution/interfaces.ts` | Array | Storage in collection files |
| `UnifiedRequest` | `src/shared/utils.ts` | Array | Webview ↔ Extension communication |
| `UnifiedRequest` | `packages/core/src/interfaces/types.ts` | **Record** | Core package internal use |
| `RequestData` | `src/webview-panels/request-tester/interfaces.ts` | Record | Webview → Extension (execution) |
| `SaveRequestData` | `src/webview-panels/request-tester/interfaces.ts` | Record | Webview → Extension (saving) |
| `RequestPreparerInput` | `src/services/interfaces/request-preparer.interface.ts` | Record | Internal execution pipeline |
| `PreparedRequest` | `src/services/interfaces/request-preparer.interface.ts` | Record | Post-preparation execution |
| `NormalizedRequest` | `src/services/request-execution/collection-request-executor.ts` | Record | Internal normalized form |
| `HttpRequest` | `packages/core/src/interfaces/types.ts` | Record | Final HTTP execution |
| `ResolvedRequest` | `packages/core/src/interfaces/types.ts` | Record | With collection context |

### Problems

1. **Duplicate definitions**: `UnifiedRequest` exists in two places with **different formats**
2. **Similar but different**: `RequestData`, `SaveRequestData`, `RequestPreparerInput` are nearly identical
3. **Format inconsistency**: Some use Array format, some use Record format for headers/query
4. **Unclear boundaries**: No clear layer separation for which type belongs where
5. **Maintenance burden**: Changes require updates in multiple places

---

## Solution: 4 Canonical Types

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LAYER 1: STORAGE                                │
│                                                                         │
│   CollectionRequest                                                     │
│   ─────────────────                                                     │
│   • Postman v2.1 compatible format                                      │
│   • Array format for headers/query (with enabled flags)                 │
│   • Used in: collection.json files, CollectionStore, import/export      │
│                                                                         │
│   headers: Array<{ key: string; value: string; enabled?: boolean }>     │
│   query: Array<{ key: string; value: string; enabled?: boolean }>       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ collectionToExecution()
┌─────────────────────────────────────────────────────────────────────────┐
│                     LAYER 2: EXECUTION INPUT                            │
│                                                                         │
│   ExecutionRequest                                                      │
│   ────────────────                                                      │
│   • Normalized format for internal processing                           │
│   • Record format for headers/query (enabled items only)                │
│   • Variables are UNRESOLVED (contains {{templates}})                   │
│   • Used in: Pre-request scripts (pm.request), ScriptExecutor input     │
│                                                                         │
│   url: "{{baseUrl}}/users/{{userId}}"     ← UNRESOLVED                  │
│   headers: Record<string, string>                                       │
│   variables: Record<string, string>                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ RequestPreparer.prepare()
┌─────────────────────────────────────────────────────────────────────────┐
│                     LAYER 3: UI COMMUNICATION                           │
│                                                                         │
│   UIRequest                                                             │
│   ─────────                                                             │
│   • Flexible format for webview communication                           │
│   • Record format for headers/query                                     │
│   • All fields optional (handles partial data)                          │
│   • Used in: Request Tester panel, save/send operations                 │
│                                                                         │
│   headers?: Record<string, string>                                      │
│   query?: Record<string, string>                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ HttpService.send()
┌─────────────────────────────────────────────────────────────────────────┐
│                        LAYER 4: RESULTS                                 │
│                                                                         │
│   ExecutionResult                                                       │
│   ───────────────                                                       │
│   • Complete execution record                                           │
│   • Contains PreparedRequest (what was RESOLVED & sent)                 │
│   • Contains HttpResponse (what was received)                           │
│   • Used in: Response display, History, Test reports, post-response     │
│                                                                         │
│   executedRequest: PreparedRequest   ← EMBEDDED (no mapping needed!)    │
│   response: HttpResponse                                                │
│   assertions: TestAssertion[]                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why PreparedRequest is Embedded in ExecutionResult

Instead of having `PreparedRequest` as a separate canonical type, we embed it inside `ExecutionResult`:

**Benefits:**
1. **No mapping needed** - Just embed the object directly
2. **Single source of truth** - Resolved request data lives in one place
3. **Simpler logic** - No need to copy fields between types
4. **Clear ownership** - `ExecutionResult` owns the complete execution record

**Data Flow:**
```
ExecutionRequest → RequestPreparer.prepare() → PreparedRequest
                                                      ↓
                                        ExecutionResult = {
                                            executedRequest,  // embed directly
                                            response,
                                            assertions,
                                            ...
                                        }
```

---

## Canonical Type Definitions

> **IMPORTANT**: All types are strongly typed. No `any` type is used anywhere.

### 1. CollectionRequest (Layer 1: Storage)

```typescript
/**
 * Request as stored in collection files
 * 
 * Characteristics:
 * - Postman v2.1 compatible format
 * - Headers and query in Array format (with enabled flags)
 * - Used for collection.json files, import/export
 */
export interface CollectionRequest {
    // Identification
    id: string;
    name: string;
    
    // Request details
    method?: string;
    url: string;
    
    // Request data (ARRAY format - collection compatible)
    headers?: Array<{ key: string; value: string; enabled?: boolean }>;
    query?: Array<{ key: string; value: string; enabled?: boolean }>;
    body?: RequestBody | null;
    bodyContentType?: string;
    
    // Parameters
    params?: Record<string, string>;
    
    // Configuration
    settings?: RequestSettings;
    scripts?: RequestScripts;
    
    // Authentication
    authType?: 'none' | 'inherit' | 'basic' | 'bearer' | 'apikey' | 'oauth2';
    bearerToken?: string;
    basicAuth?: BasicAuthConfig;
    apikey?: ApiKeyConfig;
    oauth2?: OAuth2Config;
    
    // Metadata
    description?: string;
    disabled?: boolean;
}
```

### 2. ExecutionRequest (Layer 2: Execution Input)

```typescript
/**
 * Request ready for execution (UNRESOLVED variables)
 * 
 * Characteristics:
 * - All headers and query in Record format (normalized)
 * - Variables are UNRESOLVED (contains {{templates}})
 * - Used as input to RequestPreparer and pre-request scripts
 * - pm.request in pre-request scripts is created from this type
 * - Auth is nested in RequestAuth object
 */
export interface ExecutionRequest {
    // Identification
    id: string;
    name: string;
    
    // Request details
    method: string;
    url: string;
    
    // Request data (RECORD format - normalized)
    headers: Record<string, string>;
    query: Record<string, string>;
    body: RequestBody | null;
    bodyContentType?: string;
    
    // Parameters
    params: Record<string, string>;
    
    // Configuration
    settings?: RequestSettings;
    scripts?: RequestScripts;
    
    // Authentication (NESTED format)
    auth?: RequestAuth;
    
    // Variable context (for script execution)
    context: ExecutionVariables;
    
    // Metadata
    description?: string;
    disabled?: boolean;
}

/**
 * Authentication configuration (used by ExecutionRequest and UIRequest)
 */
export interface RequestAuth {
    type?: 'none' | 'inherit' | 'basic' | 'bearer' | 'apikey' | 'oauth2';
    bearerToken?: string;
    basicAuth?: BasicAuthConfig;
    apikey?: ApiKeyConfig;
    oauth2?: OAuth2Config;
}
```

> **Note**: `ExecutionRequest` uses nested `auth: RequestAuth` object, while `CollectionRequest` 
> uses flat auth properties (`authType`, `bearerToken`, etc.) for Postman compatibility.

### 3. UIRequest (Layer 3: UI Communication)

```typescript
/**
 * Request sent/received from webview
 * 
 * Characteristics:
 * - Headers and query in Record format (UI friendly)
 * - All fields optional (handles partial data)
 * - Used for Request Tester and collection operations
 * - Auth is nested in RequestAuth object
 */
export interface UIRequest {
    // Identification (optional for new requests)
    id?: string;
    name?: string;
    
    // Request details (path or url, method)
    path?: string;  // Can be full URL or path
    url?: string;   // Alternative to path
    method?: string;
    
    // Request data (RECORD format - UI friendly)
    headers?: Record<string, string>;
    query?: Record<string, string>;
    body?: RequestBody | null;
    bodyContentType?: string;
    
    // Parameters
    params?: Record<string, string>;
    
    // Configuration
    settings?: RequestSettings;
    scripts?: RequestScripts;
    
    // Authentication (NESTED format, same as ExecutionRequest)
    auth?: RequestAuth;
    
    // Collection context
    collectionId?: string;
    requestId?: string;
    folderPath?: string;
    
    // Metadata
    readonly?: boolean;
    saveResponse?: boolean;
    description?: string;
    disabled?: boolean;
}
```

### 4. ExecutionResult (Layer 4: Results)

```typescript
/**
 * Prepared request - all variables RESOLVED, ready for HTTP transmission
 * This is embedded in ExecutionResult, not a separate canonical type
 */
export interface PreparedRequest {
    // Fully resolved URL (no {{variables}})
    url: string;
    
    // HTTP method
    method: string;
    
    // Resolved headers (no {{variables}})
    headers: Record<string, string>;
    
    // Encoded body ready for transmission
    body: RequestBodyEncoded;
    
    // Resolved path parameters
    params: Record<string, string>;
    
    // Resolved query parameters
    query: Record<string, string>;
}

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
    cookies?: Record<string, string>;
}

/**
 * Result from executing a request
 * 
 * Characteristics:
 * - Contains PreparedRequest (what was RESOLVED & sent) - NO MAPPING NEEDED
 * - Contains HttpResponse (what was received)
 * - Assertions and console output from scripts
 * - Modified variables from scripts
 * 
 * For post-response scripts:
 * - pm.request is created from result.executedRequest
 * - pm.response is created from result.response
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
    
    // Errors
    error?: string;
}
```

**Benefits of embedding PreparedRequest:**
```typescript
// Simple construction - just embed objects, no mapping!
const result: ExecutionResult = {
    requestId: execution.id,
    name: execution.name,
    executedRequest: prepared,   // ← Just embed directly!
    response: httpResponse,      // ← Just embed directly!
    duration: endTime - startTime,
    timestamp: Date.now(),
    passed: assertions.every(a => a.passed),
    assertions
};

// Simple access in post-response scripts
pm.request.url      // → result.executedRequest.url
pm.request.headers  // → result.executedRequest.headers
pm.response.code    // → result.response.status
pm.response.body    // → result.response.body
```

---

## Shared Types

```typescript
/**
 * Request settings (shared across all layers)
 */
export interface RequestSettings {
    timeout?: number;
    followRedirects?: boolean;
    followOriginalMethod?: boolean;
    followAuthHeader?: boolean;
    maxRedirects?: number;
    strictSSL?: boolean;
    decompress?: boolean;
    includeCookies?: boolean;
}

/**
 * Request scripts (shared across all layers)
 */
export interface RequestScripts {
    preRequest?: string;
    postResponse?: string;
}

/**
 * Test assertion result
 */
export interface TestAssertion {
    name: string;
    passed: boolean;
    message?: string;
}

/**
 * Basic authentication configuration
 */
export interface BasicAuthConfig {
    username?: string;
    password?: string;
}

/**
 * API Key authentication configuration
 */
export interface ApiKeyConfig {
    key: string;
    value: string;
    in?: 'header' | 'query';
}

/**
 * OAuth2 authentication configuration
 */
export interface OAuth2Config {
    grantType: 'client_credentials' | 'authorization_code' | 'password' | 'implicit';
    tokenUrl?: string;
    authUrl?: string;
    clientId?: string;
    clientSecret?: string;
    scope?: string;
    username?: string;
    password?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenPrefix?: string;
}

/**
 * Combined authentication configuration
 */
export interface RequestAuth {
    type: 'none' | 'inherit' | 'basic' | 'bearer' | 'apikey' | 'oauth2';
    basic?: BasicAuthConfig;
    bearer?: { token: string };
    apikey?: ApiKeyConfig;
    oauth2?: OAuth2Config;
}

/**
 * JSON-compatible value types (for response body)
 */
export type JsonValue = 
    | string 
    | number 
    | boolean 
    | null 
    | JsonValue[] 
    | { [key: string]: JsonValue };

/**
 * Encoded body types for HTTP transmission
 * Used in PreparedRequest (embedded in ExecutionResult)
 */
export type RequestBodyEncoded = 
    | string           // Raw text, JSON string
    | FormData         // Form data (browser)
    | URLSearchParams  // URL encoded
    | Buffer           // Binary data
    | null;            // No body
```

---

## Adapter Functions

### File: `src/shared/adapters/request-adapters.ts`

```typescript
// ============================================
// CollectionRequest → ExecutionRequest
// ============================================

/**
 * Convert CollectionRequest to ExecutionRequest
 * Normalizes headers/query from Array to Record format
 */
export function collectionToExecution(
    collection: CollectionRequest,
    variables: ExecutionVariables
): ExecutionRequest {
    return {
        id: collection.id,
        name: collection.name,
        method: collection.method || 'GET',
        url: collection.url,
        headers: normalizeHeadersFromArray(collection.headers),
        query: normalizeQueryFromArray(collection.query),
        body: collection.body || null,
        bodyContentType: collection.bodyContentType,
        params: collection.params || {},
        settings: collection.settings,
        scripts: collection.scripts,
        auth: buildAuthFromCollection(collection),
        ...variables,
        description: collection.description,
        disabled: collection.disabled
    };
}

// ============================================
// ExecutionRequest → CollectionRequest
// ============================================

/**
 * Convert ExecutionRequest to CollectionRequest
 * Converts headers/query from Record to Array format
 */
export function executionToCollection(
    execution: ExecutionRequest
): CollectionRequest {
    return {
        id: execution.id,
        name: execution.name,
        method: execution.method,
        url: execution.url,
        headers: normalizeHeadersToArray(execution.headers),
        query: normalizeQueryToArray(execution.query),
        body: execution.body,
        bodyContentType: execution.bodyContentType,
        params: execution.params,
        settings: execution.settings,
        scripts: execution.scripts,
        description: execution.description,
        disabled: execution.disabled
    };
}

// ============================================
// UIRequest → ExecutionRequest
// ============================================

/**
 * Convert UIRequest to ExecutionRequest
 */
export function uiToExecution(
    ui: UIRequest,
    variables: ExecutionVariables
): ExecutionRequest {
    return {
        id: ui.id || 'temp-' + Date.now(),
        name: ui.name || 'Request',
        method: ui.method || 'GET',
        url: ui.url || ui.path || '',
        headers: ui.headers || {},
        query: ui.query || {},
        body: ui.body || null,
        bodyContentType: ui.bodyContentType,
        params: ui.params || {},
        settings: ui.settings,
        scripts: ui.scripts,
        auth: buildAuthFromUI(ui),
        ...variables,
        description: ui.description,
        disabled: ui.disabled
    };
}

// ============================================
// CollectionRequest → UIRequest
// ============================================

/**
 * Convert CollectionRequest to UIRequest
 */
export function collectionToUI(collection: CollectionRequest): UIRequest {
    return {
        id: collection.id,
        name: collection.name,
        method: collection.method,
        url: collection.url,
        headers: normalizeHeadersFromArray(collection.headers),
        query: normalizeQueryFromArray(collection.query),
        body: collection.body,
        bodyContentType: collection.bodyContentType,
        params: collection.params,
        settings: collection.settings,
        scripts: collection.scripts,
        authType: collection.authType,
        bearerToken: collection.bearerToken,
        basicAuth: collection.basicAuth,
        apikey: collection.apikey,
        oauth2: collection.oauth2,
        description: collection.description,
        disabled: collection.disabled
    };
}

// ============================================
// ExecutionResult → UIRequest
// ============================================

/**
 * Convert ExecutionResult to UIRequest (read-only view)
 */
export function resultToUI(result: ExecutionResult): UIRequest {
    return {
        id: result.requestId,
        name: result.name,
        url: result.url,
        method: result.method,
        headers: result.requestHeaders,
        query: result.requestQuery,
        body: result.requestBody ? { type: 'raw', content: result.requestBody } : null,
        params: result.requestParams,
        readonly: true
    };
}

// ============================================
// Helper Functions
// ============================================

function normalizeHeadersFromArray(
    headers?: Array<{ key: string; value: string; enabled?: boolean }>
): Record<string, string> {
    const result: Record<string, string> = {};
    if (!headers) return result;
    
    headers.forEach(h => {
        if (h.enabled !== false) {
            result[h.key] = h.value;
        }
    });
    
    return result;
}

function normalizeHeadersToArray(
    headers: Record<string, string>
): Array<{ key: string; value: string; enabled: boolean }> {
    return Object.entries(headers).map(([key, value]) => ({
        key,
        value,
        enabled: true
    }));
}

function normalizeQueryFromArray(
    query?: Array<{ key: string; value: string; enabled?: boolean }>
): Record<string, string> {
    const result: Record<string, string> = {};
    if (!query) return result;
    
    query.forEach(q => {
        if (q.enabled !== false) {
            result[q.key] = q.value;
        }
    });
    
    return result;
}

function normalizeQueryToArray(
    query: Record<string, string>
): Array<{ key: string; value: string; enabled: boolean }> {
    return Object.entries(query).map(([key, value]) => ({
        key,
        value,
        enabled: true
    }));
}
```

---

## pm.request Construction in Scripts

A critical aspect of the type system is how `pm.request` is constructed for Postman-compatible scripts. The data source differs between pre-request and post-response scripts.

### Overview

| Script Phase | Data Source | pm.request Shows | Purpose |
|--------------|-------------|------------------|---------|
| **Pre-request** | `ExecutionRequest` | Templates with `{{variables}}` | Modify before sending |
| **Post-response** | `ExecutionResult` | Resolved actual values | Inspect what was sent |

### Pre-request Scripts: Use ExecutionRequest

In pre-request scripts, `pm.request` is created from `ExecutionRequest` which contains **unresolved templates**:

```typescript
// Pre-request script sees templates (variables not yet resolved)
pm.request.url       // "{{baseUrl}}/users/{{userId}}"
pm.request.headers   // { "Authorization": "Bearer {{token}}" }
pm.request.body.raw  // '{"name": "{{userName}}"}'
```

The script can **modify** these values before the request is sent:

```javascript
// Pre-request script can modify the request
pm.request.headers.add({ key: 'X-Custom', value: 'test' });
pm.request.url = pm.request.url + '?debug=true';
```

### Post-response Scripts: Use ExecutionResult

In post-response scripts, `pm.request` is created from `ExecutionResult` which contains **resolved values** (what was actually sent):

```typescript
// Post-response script sees resolved values
pm.request.url       // "https://api.example.com/users/123"
pm.request.headers   // { "Authorization": "Bearer actual-token-value" }
pm.request.body.raw  // '{"name": "John Doe"}'
```

The script can **inspect** what was sent to verify/debug:

```javascript
// Post-response script can inspect what was sent
console.log('Sent to:', pm.request.url);
console.log('Auth header:', pm.request.headers.get('Authorization'));

// And test the response
pm.test('Status is 200', () => {
    pm.expect(pm.response.code).to.equal(200);
});
```

### Why This Matters

This design matches **Postman's behavior**:

1. **Pre-request**: You see templates so you can modify them before resolution
2. **Post-response**: You see actual values so you can debug what was sent

### Implementation Functions

```typescript
// ============================================
// Create pm.request for Pre-request Scripts
// ============================================

/**
 * Create pm.request object from ExecutionRequest (templates)
 * Used in pre-request scripts where variables are NOT yet resolved
 */
export function createPmRequestFromExecution(exec: ExecutionRequest): PmRequestObject {
    return {
        url: exec.url,              // "{{baseUrl}}/users/{{userId}}"
        method: exec.method,
        headers: createHeadersProxy(exec.headers),
        body: createBodyProxy(exec.body),
        params: exec.params,        // { userId: "{{userId}}" }
        query: exec.query,
        // ... other pm.request properties
    };
}

// ============================================
// Create pm.request for Post-response Scripts
// ============================================

/**
 * Create pm.request object from ExecutionResult (resolved values)
 * Used in post-response scripts where variables ARE resolved
 */
export function createPmRequestFromResult(result: ExecutionResult): PmRequestObject {
    return {
        url: result.url,                    // "https://api.example.com/users/123"
        method: result.method,
        headers: createHeadersProxy(result.requestHeaders || {}),
        body: createBodyProxy(result.requestBody),
        params: result.requestParams || {},  // { userId: "123" }
        query: result.requestQuery || {},
        // ... other pm.request properties
    };
}
```

### Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                         PRE-REQUEST PHASE                              │
│                                                                        │
│   CollectionRequest ──▶ collectionToExecution() ──▶ ExecutionRequest   │
│                                                           │            │
│                                                           ▼            │
│                                          createPmRequestFromExecution()│
│                                                           │            │
│                                                           ▼            │
│                                               pm.request (templates)   │
│                                               ────────────────────     │
│                                               url: "{{baseUrl}}/..."   │
│                                               headers: {{token}}       │
│                                                           │            │
│                                                           ▼            │
│                                               Script can MODIFY        │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ RequestPreparer resolves variables
┌────────────────────────────────────────────────────────────────────────┐
│                         HTTP EXECUTION                                 │
│                                                                        │
│   PreparedRequest (resolved) ──▶ HttpService.send() ──▶ HttpResponse   │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Build ExecutionResult
┌────────────────────────────────────────────────────────────────────────┐
│                        POST-RESPONSE PHASE                             │
│                                                                        │
│   ExecutionResult ──▶ createPmRequestFromResult() ──▶ pm.request       │
│                                                       ────────────     │
│                                                       url: "https://..." │
│                                                       headers: actual  │
│                                                           │            │
│                                                           ▼            │
│                                               Script can INSPECT       │
│                                                                        │
│   ExecutionResult ──▶ createPmResponse() ──▶ pm.response               │
│                                               ───────────              │
│                                               status: 200              │
│                                               body: {...}              │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Points

1. **ExecutionRequest** is the source for pre-request `pm.request` (templates)
2. **ExecutionResult** is the source for post-response `pm.request` (resolved)
3. **ExecutionResult** must contain the resolved request data (url, headers, body, params, query)
4. This matches Postman's behavior exactly

---

## Migration Mapping

### Types to Consolidate

| Old Type | → New Type | Action |
|----------|------------|--------|
| `CollectionRequest` (interfaces.ts) | `CollectionRequest` | Move to shared/types, enhance |
| `UnifiedRequest` (shared/utils.ts) | `UIRequest` | Replace, add adapter |
| `RequestData` | `UIRequest` | Replace |
| `SaveRequestData` | `UIRequest` | Replace |
| `RequestPreparerInput` | `ExecutionRequest` | Replace |
| `NormalizedRequest` | `ExecutionRequest` | Delete, use canonical |

### Files to Update

| File | Changes |
|------|---------|
| `src/shared/types/index.ts` | **NEW** - Canonical type definitions |
| `src/shared/adapters/request-adapters.ts` | **NEW** - Adapter functions |
| `src/services/request-execution/interfaces.ts` | Re-export `CollectionRequest` from shared/types |
| `src/shared/utils.ts` | Replace `UnifiedRequest` with `UIRequest` |
| `src/webview-panels/request-tester/interfaces.ts` | Replace `RequestData`, `SaveRequestData` |
| `src/services/interfaces/request-preparer.interface.ts` | Use `ExecutionRequest` |
| `src/services/request-execution/collection-request-executor.ts` | Remove `NormalizedRequest` |

---

## Implementation Phases

### Phase 1: Create Foundation (No Breaking Changes)

**Goal**: Create new types and adapters without modifying existing code

**Files to Create**:
```
src/shared/types/index.ts              - 4 canonical types
src/shared/adapters/request-adapters.ts - Conversion functions
src/shared/adapters/index.ts           - Re-exports
```

**Verification**:
- [ ] New files compile without errors
- [ ] All existing tests still pass
- [ ] No changes to existing code

---

### Phase 2: Add Re-exports and Aliases (Backward Compatible)

**Goal**: Make canonical types available alongside existing types

**Changes**:
1. Re-export canonical types from existing locations
2. Add deprecation comments to old types
3. Update imports incrementally

**Example**:
```typescript
// src/services/request-execution/interfaces.ts
import { CollectionRequest as CanonicalCollectionRequest } from '../../shared/types';

// Keep old type as alias for backward compatibility
/** @deprecated Use CollectionRequest from shared/types */
export type CollectionRequest = CanonicalCollectionRequest;

// Re-export canonical type
export { CanonicalCollectionRequest as CollectionRequest };
```

**Verification**:
- [ ] All existing code compiles
- [ ] All tests pass
- [ ] Both old and new imports work

---

### Phase 3: Gradual Migration

**Goal**: Update services to use canonical types and adapters

**Order of Migration**:
1. `CollectionStore` - Use `CollectionRequest` + adapters
2. `CollectionRequestExecutor` - Use `ExecutionRequest`
3. `RequestPreparer` - Accept `ExecutionRequest`
4. `RequestTesterPanel` - Use `UIRequest`
5. `ScriptExecutor` - Use `ExecutionRequest`

**For Each Service**:
1. Update imports to use canonical types
2. Add adapter calls at boundaries
3. Update method signatures
4. Run tests
5. Commit changes

**Verification**:
- [ ] Each service compiles after changes
- [ ] Unit tests pass
- [ ] Integration tests pass

---

### Phase 4: Cleanup

**Goal**: Remove deprecated types and consolidate

**Actions**:
1. Remove old type definitions
2. Remove type aliases
3. Update all remaining imports
4. Update documentation

**Verification**:
- [ ] No deprecated types remain
- [ ] All code uses canonical types
- [ ] Full test suite passes
- [ ] Documentation updated

---

## Data Flow Examples

### Example 1: Execute Collection Request

```
┌──────────────────┐
│ collection.json  │  CollectionRequest (Array format)
└────────┬─────────┘
         │
         ▼ collectionToExecution()
┌──────────────────┐
│ ExecutionRequest │  Record format, with variables
└────────┬─────────┘
         │
         ▼ RequestPreparer.prepare()
┌──────────────────┐
│ PreparedRequest  │  Resolved URLs, headers, body
└────────┬─────────┘
         │
         ▼ HttpService.send()
┌──────────────────┐
│ HttpResponse     │  Raw HTTP response
└────────┬─────────┘
         │
         ▼ buildExecutionResult()
┌──────────────────┐
│ ExecutionResult  │  Complete execution record
└──────────────────┘
```

### Example 2: Save Request from UI

```
┌──────────────────┐
│ Webview Form     │  User input
└────────┬─────────┘
         │
         ▼ postMessage({ command: 'saveRequest', request: UIRequest })
┌──────────────────┐
│ UIRequest        │  Record format, partial data
└────────┬─────────┘
         │
         ▼ uiToCollection()
┌──────────────────┐
│ CollectionRequest│  Array format, complete
└────────┬─────────┘
         │
         ▼ CollectionStore.save()
┌──────────────────┐
│ collection.json  │  Persisted to disk
└──────────────────┘
```

### Example 3: Open Request in Tester

```
┌──────────────────┐
│ collection.json  │  CollectionRequest (Array format)
└────────┬─────────┘
         │
         ▼ collectionToUI()
┌──────────────────┐
│ UIRequest        │  Record format
└────────┬─────────┘
         │
         ▼ postMessage({ command: 'loadRequest', request: UIRequest })
┌──────────────────┐
│ Webview Form     │  Populated form fields
└──────────────────┘
```

---

## Benefits

| Benefit | Description |
|---------|-------------|
| **Clarity** | One type per layer with clear, documented purpose |
| **Consistency** | Same format throughout each layer |
| **Maintainability** | Single source of truth for each type |
| **Type Safety** | Adapter functions ensure correct conversion |
| **Discoverability** | Easy to find the right type for each use case |
| **Testing** | Adapters can be unit tested independently |

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing code | Medium | High | Phase 2 uses aliases, gradual migration |
| Missing edge cases in adapters | Medium | Medium | Comprehensive unit tests for adapters |
| Core package divergence | Low | Medium | Keep core package separate initially |
| Merge conflicts | Medium | Low | Small, focused PRs per phase |
| Performance overhead from adapters | Low | Low | Adapters are simple O(n) transforms |

---

## Success Criteria

- [ ] All 10+ request types consolidated to 4 canonical types
- [ ] Zero compilation errors
- [ ] All existing tests pass
- [ ] No breaking changes to public API
- [ ] Clear documentation for each type
- [ ] Adapter functions tested with 100% coverage
- [ ] Migration guide available for contributors

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Foundation | 1 day | None |
| Phase 2: Aliases | 1 day | Phase 1 |
| Phase 3: Migration | 3-4 days | Phase 2 |
| Phase 4: Cleanup | 1 day | Phase 3 |
| **Total** | **6-7 days** | |

---

## Appendix: Complete Type Comparison

### Before (10+ types)

```
CollectionRequest     - Array format, storage
UnifiedRequest (utils) - Array format, UI communication  
UnifiedRequest (core)  - Record format, core internal
RequestData           - Record format, webview execution
SaveRequestData       - Record format, webview save
RequestPreparerInput  - Record format, preparer input
PreparedRequest       - Record format, preparer output
NormalizedRequest     - Record format, executor internal
HttpRequest           - Record format, HTTP client
ResolvedRequest       - Record format, with context
```

### After (4 canonical types + 2 embedded)

```
CANONICAL TYPES (4):
────────────────────
CollectionRequest  - Array format, storage layer (UNRESOLVED)
ExecutionRequest   - Record format, execution input (UNRESOLVED, for pre-request pm.request)
UIRequest          - Record format, UI communication layer
ExecutionResult    - Record format, results layer (contains PreparedRequest + HttpResponse)

EMBEDDED IN ExecutionResult (2):
────────────────────────────────
PreparedRequest    - Record format, HTTP ready (RESOLVED) - embedded, not standalone
HttpResponse       - Record format, HTTP response - embedded, not standalone
```

### Type Usage Summary

| Type | Variables | Used For | pm.request Source |
|------|-----------|----------|-------------------|
| `CollectionRequest` | Unresolved | Storage, collection.json | - |
| `ExecutionRequest` | Unresolved | Pre-request scripts, preparer input | **Pre-request** |
| `UIRequest` | Unresolved | Webview communication | - |
| `ExecutionResult` | **Resolved** | History, test results, post-response | **Post-response** (via `.executedRequest`) |

### Why PreparedRequest is Embedded (Not Standalone)

| Approach | Pros | Cons |
|----------|------|------|
| **Standalone** | Explicit type | Requires mapping all fields to ExecutionResult |
| **Embedded** ✅ | No mapping, simpler logic | Slightly deeper nesting |

**Embedded approach wins** because:
```typescript
// ❌ Standalone: Need to map every field
const result: ExecutionResult = {
    url: prepared.url,           // manual copy
    method: prepared.method,     // manual copy
    requestHeaders: prepared.headers,  // manual copy & rename
    // ... tedious and error-prone
};

// ✅ Embedded: Just embed the object
const result: ExecutionResult = {
    executedRequest: prepared,   // done!
    response: httpResponse,      // done!
};
```

### Strong Typing Guarantee

All types are strongly typed with **no `any` usage**:

| Type | Auth Type | Body Type |
|------|-----------|-----------|
| `CollectionRequest` | `BasicAuthConfig`, `ApiKeyConfig`, `OAuth2Config` | `RequestBody` |
| `ExecutionRequest` | `RequestAuth` | `RequestBody` |
| `UIRequest` | `BasicAuthConfig`, `ApiKeyConfig`, `OAuth2Config` | `RequestBody` |
| `ExecutionResult` | - | Contains `PreparedRequest.body` + `HttpResponse.body` |
| `PreparedRequest` (embedded) | - | `RequestBodyEncoded` |
| `HttpResponse` (embedded) | - | `JsonValue \| string \| Buffer \| null` |

---

## References

- [Postman Collection Format v2.1](https://schema.postman.com/json/collection/v2.1.0/docs/index.html)
- [HTTP Forge Architecture](./http-forge/DESIGN.md)
- [SOLID Architecture](./SOLID-ARCHITECTURE.md)
