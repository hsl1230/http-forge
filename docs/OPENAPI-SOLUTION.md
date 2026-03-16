# OpenAPI Round-Trip for HTTP Forge — Solution Document

> **Status:** ✅ Implemented (all 6 phases complete)  
> **Date:** 2026-02-25 (proposed) → 2026-02-26 (completed)  
> **Scope:** Import OpenAPI 3.0 specs → Collections, Export Collections → OpenAPI 3.0 specs, User-editable response schemas, Schema inference from execution history & post-response scripts

---

## 1. Problem Statement

HTTP Forge stores rich request metadata (method, URL, headers, query, body, auth) but **no response schemas, no parameter type annotations, and no status code documentation**. This makes it impossible to generate an OpenAPI/Swagger document from saved collections — a capability teams need to:

- Share API documentation with consumers who use Swagger UI
- Generate client SDKs from the spec
- Validate API contracts
- Import existing OpenAPI specs as testable collections

### What HTTP Forge Stores Today

| Data                        | Stored? | Location                          |
|-----------------------------|---------|-----------------------------------|
| HTTP method, URL template   | ✅      | `request.json`                    |
| Path / query / header params| ✅      | `request.json`                    |
| **Path parameter types/descriptions** | ❌ | `params` is `Record<string, string>` — no type metadata |
| Request body (with format)  | ✅      | `request.json` + `body.json`      |
| **Request body schema**     | ❌      | —                                 |
| Auth (bearer/basic/apikey/oauth2) | ✅ | `request.json` / `collection.json` |
| Request description         | ✅      | `request.json`                    |
| Folder hierarchy            | ✅      | `folder.json`                     |
| Environment variables       | ✅      | `environments/*.json`             |
| **Response schemas**        | ❌      | —                                 |
| **Parameter types/constraints** | ❌  | —                                 |
| **Expected status codes**   | ❌      | —                                 |
| **Response examples**       | ❌      | —                                 |

### What DOES Exist (Hidden Gold)

| Source                       | Contains                                          | Location                                                |
|------------------------------|---------------------------------------------------|---------------------------------------------------------|
| **FullResponse files**       | Complete response body, headers, status            | `shared-histories/{env}/{path}/{entryId}.json`          |
| **ExecutionResult** (runtime)| Full response with body                            | In-memory during test suite execution                   |
| **Test suite result files**  | Response headers + body per request                | `results/` directory                                    |
| **Post-response scripts**    | Field access patterns (`pm.response.json().field`) | `scripts/post-response.js` per request                  |

These existing data sources can be mined to **infer** response schemas automatically.

---

## 2. Solution Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        HTTP Forge Extension                         │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────────────┐    │
│  │  OpenAPI      │    │  OpenAPI      │    │  Schema Inference  │    │
│  │  Importer     │    │  Exporter     │    │  Engine            │    │
│  │              │    │              │    │                    │    │
│  │  .yaml/.json │    │  Collection  │    │  History Analyzer  │    │
│  │  ──────────► │    │  ──────────► │    │  Script Analyzer   │    │
│  │  Collection   │    │  .yaml/.json │    │  JSON Schema       │    │
│  │  + Schemas    │    │  (OAS 3.0)   │    │  Inferrer          │    │
│  └──────┬───────┘    └──────┬───────┘    └─────────┬──────────┘    │
│         │                   │                      │               │
│         ▼                   ▼                      ▼               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Collection Service                         │  │
│  │  request.json + body.json + response.schema.json + folder.json │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Request Tester Webview Panel                     │  │
│  │  [Request] [Headers] [Body] [Scripts] [Response Schema ✨]   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Response schema storage | Separate `response.schema.json` per request | Backward-compatible; keeps `request.json` clean |
| Request body schema storage | Separate `body.schema.json` per request | Mirrors response schema pattern; `body.json` stays as the example value |
| Parameter types | Optional `type` field on `KeyValueEntry` | Backward-compatible; missing = `string` |
| OpenAPI library | In-house generator (no `swagger-parser` dep) | Full control over HTTP Forge → OAS mapping |
| `$ref` resolution on import | Bundle `@apidevtools/json-schema-ref-parser` | Handles deeply nested `$ref` chains reliably |
| YAML support | `yaml` npm package | Small, well-maintained, needed for import + export |
| Response inference | History + scripts + manual editing | Multi-source approach gives best coverage |

---

## 3. Data Model Changes

### 3.1 New File: `response.schema.json`

Stored alongside `request.json` in each request directory:

```
collections/
  my-api/
    users/
      get-users/
        request.json
        body.json              ← (existing) request body example
        body.schema.json       ← (NEW) request body schema
        response.schema.json   ← (NEW) response definitions
        scripts/
```

**Schema:**

```jsonc
{
  "$schema": "../../../resources/response-schema.schema.json",
  "responses": {
    "200": {
      "description": "Successful response — returns list of users",
      "contentType": "application/json",
      "schema": {
        "type": "array",
        "items": {
          "$ref": "#/components/User"
        }
      },
      "examples": {
        "default": {
          "summary": "Two users",
          "value": [
            { "id": 1, "name": "Alice", "email": "alice@example.com" },
            { "id": 2, "name": "Bob", "email": "bob@example.com" }
          ]
        }
      },
      "headers": {
        "X-Total-Count": {
          "description": "Total number of users",
          "schema": { "type": "integer" }
        }
      }
    },
    "401": {
      "description": "Unauthorized — missing or invalid bearer token",
      "contentType": "application/json",
      "schema": {
        "type": "object",
        "properties": {
          "error": { "type": "string" },
          "message": { "type": "string" }
        }
      }
    },
    "404": {
      "description": "Not found"
    },
    "default": {
      "description": "Unexpected error",
      "contentType": "application/json",
      "schema": {
        "type": "object",
        "properties": {
          "code":    { "type": "integer" },
          "message": { "type": "string" }
        }
      }
    }
  },
  "components": {
    "User": {
      "type": "object",
      "properties": {
        "id": { "type": "integer", "format": "int64" },
        "name": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "createdAt": { "type": "string", "format": "date-time" }
      },
      "required": ["id", "name", "email"]
    }
  }
}
```

**Validation schema** to be added at `resources/response-schema.schema.json`.

### 3.2 New File: `body.schema.json`

Stored alongside `body.json` in each request directory. Captures the JSON Schema
for the request body — preserving property descriptions, required fields, validation
constraints, and `$ref` component references that would otherwise be lost when an
OpenAPI spec is imported and reduced to a single example value.

**Schema:**

```jsonc
{
  "$schema": "../../../resources/body-schema.schema.json",
  "contentType": "application/json",
  "schema": {
    "type": "object",
    "properties": {
      "name":     { "type": "string", "description": "Full name of the user", "minLength": 1 },
      "email":    { "type": "string", "format": "email", "description": "Contact email" },
      "age":      { "type": "integer", "minimum": 0, "maximum": 150 },
      "roles":    { "type": "array", "items": { "type": "string", "enum": ["admin", "user", "viewer"] } }
    },
    "required": ["name", "email"]
  },
  "components": {
    "Address": {
      "type": "object",
      "properties": {
        "street": { "type": "string" },
        "city":   { "type": "string" },
        "zip":    { "type": "string", "pattern": "^[0-9]{5}$" }
      }
    }
  }
}
```

The `body.json` file continues to hold the **example value** (the actual body content
sent in requests). `body.schema.json` holds the **structural definition** — this
separation mirrors how OpenAPI distinguishes `schema` from `example`.

**Validation schema** to be added at `resources/body-schema.schema.json`.

### 3.3 Extended `KeyValueEntry`

Current:
```typescript
interface KeyValueEntry {
  key: string;
  value: string;
  enabled: boolean;
}
```

Proposed (backward-compatible additions):
```typescript
interface KeyValueEntry {
  key: string;
  value: string;
  enabled: boolean;
  // NEW — optional fields for OpenAPI generation
  type?: 'string' | 'integer' | 'number' | 'boolean' | 'array';
  required?: boolean;
  description?: string;
  format?: string;       // e.g., "date-time", "email", "uuid"
  enum?: string[];       // allowed values
  deprecated?: boolean;  // OAS deprecated flag
}
```

### 3.4 Extended Path Parameters

Current:
```typescript
// request.json
{
  "params": { "userId": "123", "orderId": "456" }   // Record<string, string>
}
```

Path parameters are stored as a simple `Record<string, string>` — just name-to-example-value pairs.
There is no room for type, description, format, or required metadata that OpenAPI provides.

Proposed (backward-compatible): change `params` to accept **either** the existing
simple format or a richer `PathParamEntry` map:

```typescript
interface PathParamEntry {
  value: string;
  // NEW — optional fields for OpenAPI generation
  type?: 'string' | 'integer' | 'number' | 'boolean';
  description?: string;
  format?: string;       // e.g., "uuid", "int64"
  enum?: string[];       // allowed values
  deprecated?: boolean;  // OAS deprecated flag
}

// params can be either format:
params?: Record<string, string>                // current simple format
       | Record<string, string | PathParamEntry>;  // extended format
```

**Example (extended format):**
```jsonc
// request.json
{
  "params": {
    "userId": {
      "value": "123",
      "type": "integer",
      "format": "int64",
      "description": "Unique user identifier"
    },
    "orderId": "456"    // simple string still works (backward-compatible)
  }
}
```

**Backward compatibility:** When reading `params`, if the value is a plain string, treat it
as `{ value: <string>, type: undefined }`. The UI and runtime continue to use only the `value`
field for actual HTTP requests. The extra metadata is consumed solely by the OpenAPI exporter.

### 3.5 Extended `CollectionRequest`

```typescript
interface CollectionRequest {
  // ... existing fields unchanged ...

  // NEW — loaded from response.schema.json
  responseSchema?: ResponseSchemaDefinition;

  // NEW — loaded from body.schema.json
  bodySchema?: BodySchemaDefinition;

  // NEW — OAS deprecated flag
  deprecated?: boolean;
}

interface BodySchemaDefinition {
  contentType?: string;
  schema: JSONSchema7;
  components?: Record<string, JSONSchema7>;
  /**
   * Multiple content types for the request body.
   * When present, takes precedence over the shorthand contentType/schema above.
   * Key is MIME type (e.g., "application/json", "multipart/form-data").
   */
  content?: Record<string, ContentDefinition>;
  /**
   * Encoding details for multipart/form-data or x-www-form-urlencoded properties.
   * Maps property name → encoding metadata (contentType, headers, style, explode).
   * Only relevant when contentType is multipart/* or x-www-form-urlencoded.
   */
  encoding?: Record<string, EncodingDefinition>;
}

/**
 * Per-property encoding metadata for multipart/form-data request bodies.
 * Mirrors the OpenAPI 3.0 Encoding Object.
 */
interface EncodingDefinition {
  /** Content type for the property (e.g., "application/json" for a JSON part) */
  contentType?: string;
  /** Serialization style: form, spaceDelimited, pipeDelimited, deepObject */
  style?: 'form' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject';
  /** Whether arrays/objects generate separate parameters */
  explode?: boolean;
  /** Allow reserved characters in values */
  allowReserved?: boolean;
  /** Additional headers for the part */
  headers?: Record<string, { description?: string; schema: JSONSchema7 }>;
}

interface ResponseSchemaDefinition {
  responses: Record<string, ResponseDefinition>;
  components?: Record<string, JSONSchema7>;
}

interface ResponseDefinition {
  description?: string;
  /** Single content-type shorthand (convenience for the common single-type case) */
  contentType?: string;
  schema?: JSONSchema7;
  examples?: Record<string, { summary?: string; value: any }>;
  /**
   * Multiple content types (mirrors OpenAPI content map).
   * When present, takes precedence over the shorthand fields above.
   * Key is MIME type (e.g., "application/json", "application/xml").
   */
  content?: Record<string, ContentDefinition>;
  headers?: Record<string, { description?: string; schema: JSONSchema7 }>;
}

interface ContentDefinition {
  schema?: JSONSchema7;
  examples?: Record<string, { summary?: string; value: any }>;
  /** Encoding information for multipart/form-data properties (see §3.2) */
  encoding?: Record<string, EncodingDefinition>;
}
```

**Resolution rules:**
- If `content` map is present, treat it as the authoritative source (ignore shorthand `contentType`/`schema`/`examples`)
- If only `contentType`+`schema` are present, treat as a single-entry `content` map: `{ [contentType]: { schema, examples } }`
- On export to OpenAPI, always emit the `content` map format
- On save from UI, if only one content type exists, store using the shorthand for simplicity
```

---

## 4. Implementation Phases

### Phase 1 — Schema Storage Foundation ✅ COMPLETE

**Goal:** Enable response schemas to be stored and loaded alongside requests.

#### 4.1.1 Response Schema JSON Schema

Create `resources/response-schema.schema.json` to validate `response.schema.json` files.

#### 4.1.2 Extend `FolderCollectionLoader`

| Method | Change |
|--------|--------|
| `loadItem()` | After loading `request.json`, check for `response.schema.json` and `body.schema.json` in the same directory. If found, parse and attach as `request.responseSchema` / `request.bodySchema` |
| `saveItem()` | If `request.responseSchema` is present, write `response.schema.json`. If `request.bodySchema` is present, write `body.schema.json`. Strip both from the main `request.json` output |
| `deleteItem()` | Also delete `response.schema.json` and `body.schema.json` if present |
| `moveItem()` | Also move `response.schema.json` and `body.schema.json` |

#### 4.1.3 Extend `JsonCollectionLoader`

For single-file format: embed `responseSchema` and `bodySchema` inline within each request object. On load, extract them; on save, include them.

#### 4.1.4 Extend `KeyValueEntry`

Add optional `type`, `required`, `description`, `format`, `enum` fields. Update the `request.schema.json` JSON Schema accordingly (all new fields optional).

**Files Modified:**
- `resources/response-schema.schema.json` (NEW)
- `resources/body-schema.schema.json` (NEW)
- `resources/request.schema.json` (extend KeyValueEntry)
- `src/shared/types/index.ts` (new types + extended KeyValueEntry)
- `src/services/collection/folder-collection-loader.ts`
- `src/services/collection/json-collection-loader.ts`

---

### Phase 2 — Schema Inference Engine ✅ COMPLETE

**Goal:** Automatically generate response schemas from available data.

#### 4.2.1 JSON Schema Inferrer (`src/services/openapi/schema-inferrer.ts`)

Core utility that generates JSON Schema from sample JSON values.

```typescript
export class SchemaInferrer {
  /**
   * Infer a JSON Schema from a sample value.
   * Recursively walks objects and arrays.
   */
  inferFromValue(value: any): JSONSchema7;

  /**
   * Merge two schemas — broadens types, unions properties.
   * Used when aggregating multiple response samples.
   */
  mergeSchemas(a: JSONSchema7, b: JSONSchema7): JSONSchema7;

  /**
   * Infer string format from value patterns.
   * Detects: date-time, date, email, uri, uuid, ipv4, ipv6
   */
  private inferStringFormat(value: string): string | undefined;
}
```

**Type inference rules:**

| JSON Value | JSON Schema Type | Format Detection |
|------------|-----------------|------------------|
| `"2026-02-25T10:30:00Z"` | `string` | `date-time` |
| `"user@example.com"` | `string` | `email` |
| `"https://api.example.com"` | `string` | `uri` |
| `"550e8400-e29b-41d4-a716-446655440000"` | `string` | `uuid` |
| `42` | `integer` | — |
| `3.14` | `number` | — |
| `true` | `boolean` | — |
| `null` | `nullable: true` (OAS 3.0) | — |
| `[...]` | `array` + inferred `items` | Merge all element schemas |
| `{...}` | `object` + inferred `properties` | Recurse into each property |

**Schema merging strategy:**

```
Sample 1: { "id": 1, "name": "Alice" }
Sample 2: { "id": 2, "name": "Bob", "email": "bob@x.com" }
Sample 3: { "id": 3, "name": null, "active": true }

Merged Schema:
{
  "type": "object",
  "properties": {
    "id":     { "type": "integer" },
    "name":   { "type": "string", "nullable": true },  // null seen in sample 3
    "email":  { "type": "string", "format": "email" },  // only in sample 2
    "active": { "type": "boolean" }                      // only in sample 3
  },
  "required": ["id", "name"]   // present in ALL samples
}
```

> **OAS 3.0 nullable semantics:** OpenAPI 3.0 uses `nullable: true` as a schema extension
> (not `type: ["string", "null"]` which is JSON Schema draft 2020-12 / OAS 3.1 syntax).
> The `SchemaInferrer` always emits `nullable: true` for OAS 3.0 compatibility. When
> `null` is the **only** observed value, the schema is `{ nullable: true }` (no `type`).
> On OAS 3.1 export (future), convert `nullable: true` → `type: ["<original>", "null"]`.

#### 4.2.2 History Analyzer (`src/services/openapi/history-analyzer.ts`)

Reads `FullResponse` files from history and shared-history directories to build response schemas.

```typescript
export class HistoryAnalyzer {
  constructor(
    private historyService: IRequestHistoryService,
    private inferrer: SchemaInferrer
  ) {}

  /**
   * Analyze all available history for a request.
   * Groups responses by status code, infers schema per group.
   */
  async analyze(
    collectionId: string,
    requestId: string,
    options?: { environment?: string; maxSamples?: number }
  ): Promise<ResponseSchemaDefinition>;
}
```

**Algorithm:**

1. Load all `HistoryEntry` records for the request (via `historyService.getHistory()`)
2. For each entry, load the corresponding `FullResponse` file (via `historyService.loadFullResponse(entryId)`)
3. Group `FullResponse` objects by `status` code
4. For each group:
   - Extract `content-type` header → `contentType`
   - If JSON body: run `inferrer.inferFromValue(body)` on each sample, then `inferrer.mergeSchemas()` across samples
   - Capture the first response body as the `default` example
   - Capture response headers that appear consistently
5. Assemble into `ResponseSchemaDefinition`

#### 4.2.3 Script Analyzer (`src/services/openapi/script-analyzer.ts`)

Static analysis of post-response scripts to extract response field expectations.

```typescript
export class ScriptAnalyzer {
  /**
   * Parse a post-response script to discover expected response fields
   * and their types from assertion patterns.
   */
  analyze(scriptSource: string): ScriptAnalysisResult;
}

interface ScriptAnalysisResult {
  /** Dot-separated field paths: ["data.users[].id", "data.users[].name"] */
  fieldPaths: string[];
  /** Type hints from assertions: { "data.count": "number", "data.active": "boolean" } */
  typeHints: Record<string, string>;
  /** Value hints from equality assertions: { "data.status": "ok" } */
  valueHints: Record<string, any>;
  /** Expected status codes from pm.response.to.have.status(N) */
  expectedStatuses: number[];
}
```

**Patterns recognized:**

| Script Pattern | Extracted Info |
|----------------|----------------|
| `pm.response.json()` | Response is JSON |
| `jsonData.users[0].name` | Field path: `users[].name` |
| `pm.expect(data.count).to.be.a('number')` | `count` is `number` |
| `pm.expect(data.active).to.be.true` | `active` is `boolean` |
| `pm.expect(data.status).to.equal('ok')` | `status` is `string`, example: `"ok"` |
| `pm.expect(data.items).to.be.an('array')` | `items` is `array` |
| `pm.expect(data.items).to.have.lengthOf(3)` | `items` is `array` |
| `pm.response.to.have.status(200)` | Expected status: `200` |
| `pm.expect(pm.response.code).to.equal(201)` | Expected status: `201` |

**Implementation approach:** Regex-based extraction (not full AST parsing) — post-response scripts are typically simple assertion chains, not complex programs. Patterns:

```typescript
// Field access: match chains like `jsonData.field.sub` or `responseJson.field`
const FIELD_ACCESS = /(?:jsonData|responseJson|data|json|body|response\.json\(\))\.([a-zA-Z_][\w.\[\]]*)/g;

// Type assertions: pm.expect(...).to.be.a('type')
const TYPE_ASSERT = /pm\.expect\(.*?\.([a-zA-Z_.]+)\)\.to\.be\.(?:a|an)\(['"](\w+)['"]\)/g;

// Equality assertions: pm.expect(...).to.equal(value)
const EQUAL_ASSERT = /pm\.expect\(.*?\.([a-zA-Z_.]+)\)\.to\.(?:equal|eql)\((.+?)\)/g;

// Status assertions
const STATUS_ASSERT = /(?:to\.have\.status|response\.code.*?equal)\((\d+)\)/g;
```

#### 4.2.4 Inference Orchestrator (`src/services/openapi/schema-inference-service.ts`)

Combines all three sources into a unified response schema.

```typescript
export class SchemaInferenceService {
  constructor(
    private historyAnalyzer: HistoryAnalyzer,
    private scriptAnalyzer: ScriptAnalyzer,
    private inferrer: SchemaInferrer
  ) {}

  /**
   * Infer a complete response schema for a request by combining
   * history data, script analysis, and any existing schema.
   */
  async infer(
    collectionId: string,
    requestId: string,
    existingSchema?: ResponseSchemaDefinition
  ): Promise<ResponseSchemaDefinition>;
}
```

**Merge priority** (highest → lowest):
1. **User-edited schema** (`response.schema.json`) — never overwritten, only augmented
2. **History data** — real response bodies provide the most accurate schemas
3. **Script hints** — field paths and types that may not appear in captured history

**Files Created:**
- `src/services/openapi/schema-inferrer.ts`
- `src/services/openapi/history-analyzer.ts`
- `src/services/openapi/script-analyzer.ts`
- `src/services/openapi/schema-inference-service.ts`

#### 4.2.5 Request Body Schema Inference

The `SchemaInferrer` (§4.2.1) can also infer a request body schema from the contents of `body.json`:

```typescript
// In SchemaInferenceService
async inferBodySchema(
  collectionId: string,
  requestId: string,
  existingSchema?: BodySchemaDefinition
): Promise<BodySchemaDefinition | undefined>;
```

**Algorithm:**

1. Load `body.json` for the request
2. If body format is `json`, parse the value and run `inferrer.inferFromValue(body)`
3. If format is `form-data` or `x-www-form-urlencoded`, build a schema from the key-value entries (using `KeyValueEntry.type` hints if available)
4. Merge with `existingSchema` — user-edited fields take priority
5. Return as `BodySchemaDefinition` with appropriate `contentType`

This allows users to refine an inferred body schema (e.g. add `description`, `minLength`, `enum` constraints) and have those survive re-inference.

**Files Modified:**
- `src/services/openapi/schema-inference-service.ts` (add `inferBodySchema` method)

---

### Phase 3 — OpenAPI Export ✅ COMPLETE

**Goal:** Generate a valid OpenAPI 3.0.3 document from a collection.

#### 4.3.1 Exporter (`src/services/openapi/openapi-exporter.ts`)

```typescript
export interface OpenApiExportOptions {
  format: 'json' | 'yaml';
  /** Environment name(s) to use for server URL resolution */
  environments?: string[];
  /** Include inferred response schemas from history */
  inferFromHistory?: boolean;
  /** OpenAPI info metadata overrides */
  info?: { title?: string; version?: string; description?: string };
}

export class OpenApiExporter {
  constructor(
    private collectionService: ICollectionService,
    private envConfigService: IEnvironmentConfigService,
    private inferenceService: SchemaInferenceService
  ) {}

  async export(
    collectionId: string,
    options: OpenApiExportOptions
  ): Promise<string>;
}
```

#### 4.3.2 Mapping Rules: HTTP Forge → OpenAPI 3.0

##### Servers

```
Environment "dev":  { baseUrl: "https://dev-api.example.com" }
Environment "prod": { baseUrl: "https://api.example.com" }

→ servers:
    - url: https://dev-api.example.com
      description: dev
    - url: https://api.example.com
      description: prod
```

Resolution: For each selected environment, resolve `{{baseUrl}}` (or the first `{{...}}` in request URLs) via `envConfigService.resolveVariables()`. Deduplicate.

##### Info

```yaml
info:
  title: {collection.name}
  description: {collection.description}
  version: {collection.version || "1.0.0"}
```

##### Paths & Operations

Each request maps to an **operation** under a **path item**:

```
Request: POST {{baseUrl}}/api/users/:userId/orders
         name: "Create User Order"
         folder: "Users / Orders"

→ paths:
    /api/users/{userId}/orders:
      post:
        operationId: createUserOrder
        summary: Create User Order
        description: {request.description}
        tags: [Users]                    ← top-level folder name
```

**URL normalization:**
1. Strip `{{baseUrl}}` (or detected base variable) prefix
2. Convert `:param` → `{param}` (HTTP Forge uses colon syntax)
3. Convert `{{variable}}` → `{variable}` for remaining path variables
4. Group requests by normalized path — multiple methods on the same path share a `PathItem`

**Operation ID generation:**
- Primary: `toCamelCase(request.name)` → ensures uniqueness by appending method if duplicate
- Fallback: `method + toCamelCase(pathSegments)`

##### Parameters

```
request.params: { userId: "123" }           → in: path, name: userId, schema: { type: string }
request.query: [{ key: "page", value: "1" }] → in: query, name: page, schema: { type: integer }
request.headers: [{ key: "X-Api-Key", ... }] → in: header, name: X-Api-Key

If extended KeyValueEntry has type hints:
  { key: "page", value: "1", type: "integer", required: true, description: "Page number" }
  → { name: page, in: query, required: true, description: "Page number",
      schema: { type: integer }, example: 1 }

If extended PathParamEntry has type hints:
  { value: "123", type: "integer", format: "int64", description: "Unique user ID" }
  → { name: userId, in: path, required: true, description: "Unique user ID",
      schema: { type: integer, format: int64 }, example: 123 }
```

**Path parameter handling:**
- Path params are always `required: true` in OpenAPI (they’re part of the URL)
- If `params.userId` is a plain string `"123"` → infer type from the value
- If `params.userId` is a `PathParamEntry` `{ value: "123", type: "integer" }` → use the explicit type
- On import, the importer stores `PathParamEntry` objects when the OpenAPI spec provides type/description metadata

**Type inference from example values** (when `type` is not explicitly set):

| Value | Inferred Type |
|-------|--------------|
| `"123"`, `"0"` | `integer` |
| `"3.14"` | `number` |
| `"true"`, `"false"` | `boolean` |
| Everything else | `string` |

##### Cookie Parameters

OpenAPI supports `in: cookie` parameters. HTTP Forge does not currently have a dedicated
cookie editor, but cookies can appear in request headers as `Cookie: key=value; ...`.

On **export**, the exporter checks for a `Cookie` header and parses it into individual
`in: cookie` parameters:

```
request.headers: [{ key: "Cookie", value: "session=abc123; theme=dark" }]

→ parameters:
    - name: session
      in: cookie
      schema: { type: string }
      example: abc123
    - name: theme
      in: cookie
      schema: { type: string }
      example: dark
```

The original `Cookie` header is then excluded from the `in: header` parameters (see
Header Filtering below).

##### Header Filtering on Export

Standard headers that are represented elsewhere in the OpenAPI spec are **excluded**
from `in: header` parameters to avoid duplication:

| Header | Reason for Exclusion |
|--------|---------------------|
| `Content-Type` | Represented by `requestBody.content` key |
| `Authorization` | Represented by `security` / `securitySchemes` |
| `Accept` | Represented by `responses.{code}.content` keys |
| `Cookie` | Converted to `in: cookie` parameters (see above) |
| `Host` | Represented by `servers[].url` |
| `Content-Length` | Auto-calculated; not a user-specified parameter |

Headers _not_ in this exclusion list are exported as `in: header` parameters as before.

##### Deprecated Flag

If a request or parameter is marked as deprecated (via a `deprecated` metadata field
or a naming convention like `[DEPRECATED]` prefix), the exporter sets the OAS `deprecated: true` flag:

```yaml
paths:
  /api/v1/users:
    get:
      deprecated: true          # ← from request.deprecated or name prefix
      summary: "[DEPRECATED] Get Users (use /v2/users)"
      parameters:
        - name: format
          in: query
          deprecated: true       # ← from KeyValueEntry.deprecated
          schema: { type: string }
```

**Detection rules:**
1. `request.deprecated === true` → set `deprecated: true` on the operation
2. Request name starts with `[DEPRECATED]` → set `deprecated: true`, strip prefix from `summary`
3. `KeyValueEntry.deprecated === true` → set `deprecated: true` on the parameter

##### Request Body

**Source priority** (highest → lowest):
1. `body.schema.json` — user-defined/refined schema with descriptions, constraints, required fields
2. Inferred from `body.json` content — auto-generated via `SchemaInferrer`
3. Structural stub — based on body format type

| HTTP Forge Body Type | OpenAPI Content Type | Schema Source |
|---------------------|---------------------|---------------|
| `raw` / `json` | `application/json` | `body.schema.json` if present, else infer from `body.json` content via `SchemaInferrer` |
| `raw` / `xml` | `application/xml` | `body.schema.json` if present, else `{ type: "string" }` (XML schema inference out of scope) |
| `raw` / `text` | `text/plain` | `{ type: "string" }` |
| `raw` / `html` | `text/html` | `{ type: "string" }` |
| `form-data` | `multipart/form-data` | `body.schema.json` if present, else infer properties from `formData` fields; `file` type → `format: binary` |
| `x-www-form-urlencoded` | `application/x-www-form-urlencoded` | `body.schema.json` if present, else infer properties from `urlencoded` fields |
| `binary` | `application/octet-stream` | `{ type: "string", format: "binary" }` |
| `graphql` | `application/json` | `{ query: string, variables: object }` |

When `body.schema.json` is available, its `components` are promoted to `#/components/schemas/` in the
output spec (alongside response components), and `$ref` pointers are rewritten accordingly.

The `body.json` content is always included as the `example` alongside the schema:

```yaml
requestBody:
  required: true
  content:
    application/json:
      schema:                         # ← from body.schema.json
        type: object
        properties:
          name:
            type: string
            description: Full name of the user
            minLength: 1
          email:
            type: string
            format: email
            description: Contact email
          age:
            type: integer
            minimum: 0
            maximum: 150
        required: [name, email]
      example:                        # ← from body.json
        name: "Alice"
        email: "alice@example.com"
        age: 30
```

**Fallback** — when no `body.schema.json` exists, the exporter infers a schema from the
`body.json` content, exactly as before:

```json
// body.json
{ "name": "New Order", "quantity": 5, "price": 29.99, "items": ["A", "B"] }

// → Generated schema:
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "quantity": { "type": "integer" },
    "price": { "type": "number" },
    "items": { "type": "array", "items": { "type": "string" } }
  },
  "example": { "name": "New Order", "quantity": 5, "price": 29.99, "items": ["A", "B"] }
}
```

##### Responses

**Source priority:**
1. `response.schema.json` — user-defined/refined schemas (highest fidelity)
2. History inference — `HistoryAnalyzer` output (auto-generated)
3. Stub — `200: { description: "Successful response" }` (fallback)

```yaml
# From response.schema.json with status 200 and 401:
responses:
  '200':
    description: Successful response — returns list of users
    content:
      application/json:
        schema:
          type: array
          items:
            $ref: '#/components/schemas/User'
        examples:
          default:
            summary: Two users
            value: [...]
  '401':
    description: Unauthorized
    content:
      application/json:
        schema:
          type: object
          properties:
            error: { type: string }
            message: { type: string }
```

**`default` response:** OpenAPI allows a `"default"` response key as a catch-all for
undocumented status codes. The `response.schema.json` format supports a `"default"` key
alongside numeric status codes (see §3.1 example). On export:

- If `response.schema.json` has a `"default"` entry → emit it as `responses.default`
- If no `"default"` entry exists, do **not** auto-generate one (keep the output explicit)
- On import, a `"default"` response is stored in `response.schema.json` under the `"default"` key

**Multiple content types per response:** When a response has multiple content types
(e.g., JSON and XML), use the `content` map in `ResponseDefinition`:

```yaml
responses:
  '200':
    description: User details
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/User'
      application/xml:
        schema:
          $ref: '#/components/schemas/User'
```

This maps to the `content` field in `ResponseDefinition` (§3.1). When exporting, if the
shorthand `contentType` is used, emit a single-entry `content` map. When the full `content`
map is present, emit all entries.

##### Security Schemes

| HTTP Forge Auth | OpenAPI Security Scheme |
|-----------------|------------------------|
| `bearer` | `{ type: http, scheme: bearer }` |
| `basic` | `{ type: http, scheme: basic }` |
| `apikey` (in: header) | `{ type: apiKey, in: header, name: {key} }` |
| `apikey` (in: query) | `{ type: apiKey, in: query, name: {key} }` |
| `oauth2` | `{ type: oauth2, flows: { ... } }` |

- Collection-level auth → global `security` + `components/securitySchemes`
- Request-level auth override → per-operation `security`
- `auth.type === 'inherit'` → inherits from parent (folder or collection)
- `auth.type === 'none'` → `security: []` (explicitly no auth)

##### Tags

Top-level folders become tags:

```
Collection: "My API"
├── Users/           ← tag: "Users"
│   ├── Get Users
│   ├── Create User
│   └── Orders/     ← tag: "Users" (inherits top-level)
│       └── Get User Orders
├── Products/        ← tag: "Products"
│   └── List Products
└── Health Check     ← tag: "default" (no folder)
```

Nested folders inherit the top-level folder's tag. Root-level requests (no folder) get the `"default"` tag or no tag.

#### 4.3.3 Component Deduplication

When multiple requests share similar response/body schemas, extract common schemas into `components/schemas`:

1. After generating all inline schemas, compare by structural equality (normalized JSON Schema)
2. Schemas referenced ≥ 2 times → promote to `components/schemas/{Name}`
3. Name derived from: request name context, or `{Method}{Path}Request`/`{Method}{Path}Response`
4. Replace inline occurrences with `$ref: '#/components/schemas/{Name}'`

This keeps the output spec DRY and readable.

#### 4.3.4 Schema Composition (`allOf` / `oneOf` / `anyOf`)

OpenAPI 3.0 supports schema composition keywords for polymorphism and model inheritance.
The exporter and importer handle these as follows:

**On Export:**
- HTTP Forge schemas stored in `response.schema.json` / `body.schema.json` may contain
  `allOf`, `oneOf`, `anyOf` if they were imported from an OpenAPI spec → preserve as-is
- The `SchemaInferrer` does **not** produce composition keywords (it generates flat schemas)
- `discriminator` objects attached to `oneOf`/`anyOf` are preserved if present

**On Import:**

| OAS Keyword | Import Handling |
|-------------|-----------------|
| `allOf` | Flatten into a single merged schema for `body.json` example generation; store original `allOf` in `body.schema.json` / `response.schema.json` for round-trip fidelity |
| `oneOf` | Pick the **first** variant for example generation; store full `oneOf` in schema files |
| `anyOf` | Same as `oneOf` — pick first variant for example, store full structure |
| `discriminator` | Preserve alongside the composition keyword; use `propertyName` to select correct variant when generating examples if possible |
| `not` | Store in schema files; skip during example generation |

**Example — `allOf` import:**

```yaml
# OpenAPI spec
components:
  schemas:
    Pet:
      type: object
      properties:
        name: { type: string }
    Dog:
      allOf:
        - $ref: '#/components/schemas/Pet'
        - type: object
          properties:
            breed: { type: string }
```

→ Stored in `response.schema.json` / `body.schema.json` with the `allOf` preserved.
→ Example generation flattens to `{ "name": "string", "breed": "string" }`.

**Example — `oneOf` with `discriminator`:**

```yaml
requestBody:
  content:
    application/json:
      schema:
        oneOf:
          - $ref: '#/components/schemas/Cat'
          - $ref: '#/components/schemas/Dog'
        discriminator:
          propertyName: petType
```

→ `body.schema.json` preserves full `oneOf` + `discriminator`.
→ `body.json` example uses the first variant (Cat) with `petType: "Cat"` injected.

#### 4.3.5 `readOnly` / `writeOnly` on Schema Properties

OpenAPI 3.0 schema properties can be annotated with `readOnly: true` (included in responses
only) or `writeOnly: true` (included in requests only):

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
          readOnly: true       # ← only in responses, not in request body
        password:
          type: string
          writeOnly: true      # ← only in request body, not in responses
        name:
          type: string
```

**Handling:**
- **On Import:** Preserve `readOnly` / `writeOnly` flags in both `response.schema.json`
  and `body.schema.json`. When generating `body.json` examples, omit `readOnly` properties.
  When displaying response schema, annotate `writeOnly` properties as "(not in response)".
- **On Export:** If `readOnly` / `writeOnly` flags are present in stored schemas, emit them.
  The `SchemaInferrer` does not produce these flags (they require semantic knowledge), but
  manually-edited or imported schemas can include them.
- **Schema Editor UI:** Display `readOnly` / `writeOnly` badges next to properties so users
  can add/toggle them during manual editing.

#### 4.3.6 Multipart `encoding` Object

For `multipart/form-data` request bodies, OpenAPI 3.0 supports an `encoding` object that
specifies per-property serialization details (content type, headers, style):

```yaml
requestBody:
  content:
    multipart/form-data:
      schema:
        type: object
        properties:
          profileImage:
            type: string
            format: binary
          metadata:
            type: object
            properties:
              tags: { type: array, items: { type: string } }
      encoding:
        profileImage:
          contentType: image/png, image/jpeg
        metadata:
          contentType: application/json
```

**Handling:**
- **On Import:** Store the `encoding` object in `body.schema.json` → `encoding` field
  (see `EncodingDefinition` in §3.2). Preserve `contentType`, `style`, `explode`,
  `allowReserved`, and `headers` per property.
- **On Export:** If `body.schema.json` has an `encoding` field and the content type is
  `multipart/form-data`, emit the `encoding` object in the OpenAPI output alongside the schema.
- **Inference:** When inferring from `form-data` fields, auto-detect `encoding`:
  - File fields → `contentType: application/octet-stream`
  - Fields with JSON-like values → `contentType: application/json`

**Files Created:**
- `src/services/openapi/openapi-exporter.ts`

---

### Phase 4 — OpenAPI Import ✅ COMPLETE

**Goal:** Parse an OpenAPI 3.0 spec and create a fully hydrated HTTP Forge collection.

#### 4.4.1 Importer (`src/services/openapi/openapi-importer.ts`)

```typescript
export interface OpenApiImportOptions {
  /** Base environment name to create with server URL */
  environmentName?: string;
  /** Collection name override */
  collectionName?: string;
}

export class OpenApiImporter {
  constructor(
    private collectionService: ICollectionService,
    private envConfigService: IEnvironmentConfigService
  ) {}

  async import(
    filePath: string,
    options?: OpenApiImportOptions
  ): Promise<{ collection: Collection; environmentCreated?: string }>;
}
```

#### 4.4.2 Mapping Rules: OpenAPI 3.0 → HTTP Forge

##### Servers → Environment + Collection Variable

```yaml
# OpenAPI
servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://staging-api.example.com/v1
    description: Staging
```

→ Collection variable: `baseUrl = https://api.example.com/v1`  
→ Optional: Create environments with each server URL as `baseUrl`

##### Tags → Folders

Each unique tag → a folder. Operations with multiple tags → placed in the first tag's folder. Untagged operations → collection root.

##### Operations → Requests

```yaml
# OpenAPI
paths:
  /users/{userId}:
    get:
      operationId: getUser
      summary: Get a user by ID
      parameters:
        - name: userId
          in: path
          required: true
          schema: { type: integer }
      responses:
        '200':
          description: User found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
```

→

```jsonc
// request.json
{
  "id": "get-user-mxxxxxx",
  "name": "Get a user by ID",
  "method": "GET",
  "url": "{{baseUrl}}/users/:userId",
  "params": {                             // extended PathParamEntry format
    "userId": {
      "value": "1",
      "type": "integer",
      "description": "Unique user identifier"
    }
  },
  "description": "Get a user by ID"
}

// response.schema.json
{
  "responses": {
    "200": {
      "description": "User found",
      "contentType": "application/json",
      "schema": { "$ref": "#/components/User" }
    }
  },
  "components": {
    "User": {
      "type": "object",
      "properties": {
        "id": { "type": "integer" },
        "name": { "type": "string" },
        "email": { "type": "string", "format": "email" }
      },
      "required": ["id", "name", "email"]
    }
  }
}
```

##### Request Body → body.json + body.schema.json + request.json body config

```yaml
requestBody:
  content:
    application/json:
      schema:
        type: object
        properties:
          name: { type: string, description: "Full name", minLength: 1 }
          age: { type: integer, minimum: 0 }
        required: [name]
      example:
        name: "Alice"
        age: 30
```

→
```jsonc
// request.json
{ \"body\": { \"type\": \"raw\", \"format\": \"json\" } }

// body.json — from example or generated from schema
{ \"name\": \"Alice\", \"age\": 30 }

// body.schema.json — preserves the full schema with descriptions & constraints
{
  \"contentType\": \"application/json\",
  \"schema\": {
    \"type\": \"object\",
    \"properties\": {
      \"name\": { \"type\": \"string\", \"description\": \"Full name\", \"minLength\": 1 },
      \"age\":  { \"type\": \"integer\", \"minimum\": 0 }
    },
    \"required\": [\"name\"]
  }
}
```

On import, `body.schema.json` captures the **full request body schema** from the OpenAPI spec —
including property descriptions, validation constraints (`minLength`, `minimum`, `pattern`, `enum`),
required fields, and `$ref` component references. This metadata would be lost if only the example
value were stored in `body.json`.

When `requestBody.content` has multiple content types (e.g. `application/json` + `multipart/form-data`),
the importer stores **all** content types in the `body.schema.json` `content` map. The primary
content type (JSON preferred) is used for `body.json` example generation and the `contentType`
shorthand field. Selection priority: `application/json` > `text/*` > `multipart/form-data` >
`application/x-www-form-urlencoded` > first available.

```jsonc
// body.schema.json — multiple content types
{
  "contentType": "application/json",         // primary (shorthand)
  "schema": { ... },                         // primary schema
  "content": {                               // all content types
    "application/json": {
      "schema": { ... }
    },
    "multipart/form-data": {
      "schema": { ... },
      "encoding": {                          // preserved from OAS encoding object
        "metadata": { "contentType": "application/json" }
      }
    }
  }
}
```

**For `multipart/form-data` and `x-www-form-urlencoded` request bodies:**

```yaml
requestBody:
  content:
    multipart/form-data:
      schema:
        type: object
        properties:
          file: { type: string, format: binary, description: "Upload file" }
          metadata: { type: string, description: "JSON metadata" }
        required: [file]
```

→
```jsonc
// request.json
{ \"body\": { \"type\": \"form-data\" } }

// body.schema.json
{
  \"contentType\": \"multipart/form-data\",
  \"schema\": {
    \"type\": \"object\",
    \"properties\": {
      \"file\":     { \"type\": \"string\", \"format\": \"binary\", \"description\": \"Upload file\" },
      \"metadata\": { \"type\": \"string\", \"description\": \"JSON metadata\" }
    },
    \"required\": [\"file\"]
  }
}
```

**Example generation from schema** (when no `example` provided):

| Schema | Generated Example |
|--------|-------------------|
| `{ type: "string" }` | `"string"` |
| `{ type: "string", format: "email" }` | `"user@example.com"` |
| `{ type: "string", format: "date-time" }` | `"2026-01-01T00:00:00Z"` |
| `{ type: "string", format: "uuid" }` | `"00000000-0000-0000-0000-000000000000"` |
| `{ type: "integer" }` | `0` |
| `{ type: "number" }` | `0.0` |
| `{ type: "boolean" }` | `false` |
| `{ type: "array", items: ... }` | `[<example of items>]` |
| `{ type: "object", properties: ... }` | `{ <each property: example> }` |
| `{ enum: ["A", "B"] }` | `"A"` (first enum value) |
| `{ nullable: true, type: "string" }` | `null` (or `"string"` — prefer non-null) |
| `{ allOf: [...] }` | Merge all sub-schemas, then generate |
| `{ oneOf: [...] }` / `{ anyOf: [...] }` | Generate from first variant |

##### Security Schemes → Auth

```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
```

→ Collection-level auth set to the first `security` requirement. Per-operation overrides mapped to request-level auth.

##### `$ref` Resolution

Before processing, resolve all `$ref` pointers using `@apidevtools/json-schema-ref-parser`:
- Inline `$ref` → resolved schema
- Circular `$ref` → break cycle with `{ type: "object" }` placeholder
- External `$ref` (file/URL) → fetch and inline

##### Deprecated Operations & Parameters

When importing operations or parameters with `deprecated: true`:

| OAS Element | HTTP Forge Storage |
|-------------|-------------------|
| `deprecated: true` on operation | Set `request.deprecated = true`; prefix name with `[DEPRECATED]` for tree view visibility |
| `deprecated: true` on parameter | Set `KeyValueEntry.deprecated = true` on the corresponding query/header entry; set `PathParamEntry.deprecated = true` for path params |

On re-export, the `deprecated` flags round-trip cleanly (see §4.3.2 Deprecated Flag).

##### Cookie Parameters

`in: cookie` parameters are converted to a synthetic `Cookie` header on import:

```yaml
# OpenAPI
parameters:
  - name: session_id
    in: cookie
    required: true
    schema: { type: string }
  - name: theme
    in: cookie
    schema: { type: string }
```

→
```jsonc
// request.json headers
[
  { "key": "Cookie", "value": "session_id={{session_id}}; theme={{theme}}" }
]
```

The individual cookie names are also stored as collection variables with example values
so they can be resolved. On re-export, the exporter decomposes the `Cookie` header back
into `in: cookie` parameters (see §4.3.2 Cookie Parameters).

##### `default` Response

The OpenAPI `"default"` response key is stored as-is in `response.schema.json`:

```yaml
# OpenAPI
responses:
  '200':
    description: Success
    content:
      application/json:
        schema: { $ref: '#/components/schemas/Result' }
  default:
    description: Unexpected error
    content:
      application/json:
        schema: { $ref: '#/components/schemas/Error' }
```

→ `response.schema.json` has keys `"200"` and `"default"`. The `"default"` key is
preserved for round-trip fidelity and exported back as `responses.default`.

##### Multiple Content Types per Response

When a response has multiple content types, the importer stores them in the `content`
map of the `ResponseDefinition` (see §3.1):

```yaml
responses:
  '200':
    description: User data
    content:
      application/json:
        schema: { $ref: '#/components/schemas/User' }
      application/xml:
        schema: { $ref: '#/components/schemas/User' }
```

→
```jsonc
// response.schema.json
{
  "responses": {
    "200": {
      "description": "User data",
      "content": {
        "application/json": {
          "schema": { "$ref": "#/components/User" }
        },
        "application/xml": {
          "schema": { "$ref": "#/components/User" }
        }
      }
    }
  }
}
```

If only one content type is present, the shorthand `contentType` + `schema` format is used instead.

##### Schema Composition on Import

`allOf`, `oneOf`, `anyOf`, and `discriminator` in request/response schemas are preserved
verbatim in `body.schema.json` and `response.schema.json`. See §4.3.4 for the full
composition handling rules and example generation strategy.

##### `readOnly` / `writeOnly` on Import

These flags are preserved in stored schemas. On `body.json` example generation, `readOnly`
properties are omitted (they only appear in responses). See §4.3.5 for full handling rules.

##### Multipart `encoding` on Import

The `encoding` object from `multipart/form-data` request bodies is stored in
`body.schema.json` → `encoding` field. See §4.3.6 for full handling rules.

**Files Created:**
- `src/services/openapi/openapi-importer.ts`
- `src/services/openapi/example-generator.ts` (schema → example value)
- `src/services/openapi/ref-resolver.ts` (`$ref` resolution wrapper)

---

### Phase 5 — Schema Editor UI ✅ COMPLETE

**Goal:** Let users view, edit, and infer request body schemas and response schemas from the Request Tester panel.

#### 4.5.1 Response Schema Tab

Add a new tab to the Request Tester webview panel:

```
[Params] [Headers] [Body] [Auth] [Scripts] [Body Schema ✨] [Response Schema ✨]
```

**Response Schema tab** contains:

1. **Monaco editor** — displays `response.schema.json` content with JSON Schema validation, autocompletion for `type`, `format`, `$ref`, etc.

2. **Toolbar buttons:**
   - **"Infer from History"** — runs `SchemaInferenceService.infer()` and populates the editor. Shows diff if schema already exists.
   - **"Capture Last Response"** — after executing a request, takes the latest response and adds it as a new status code entry / merges into existing schema.
   - **"Generate Example"** — for import-created schemas that have a schema but no example, generates one from the schema.

3. **Status code tabs** — within the Response Schema tab, sub-tabs for each status code (200, 400, 404, etc.) for easy navigation.

#### 4.5.2 Body Schema Tab

**Body Schema tab** contains:

1. **Monaco editor** — displays `body.schema.json` content with JSON Schema validation and autocompletion.

2. **Toolbar buttons:**
   - **"Infer from Body"** — runs `SchemaInferenceService.inferBodySchema()` using the current `body.json` content. Shows diff if schema already exists.
   - **"Generate Example Body"** — opposite direction: generates a sample `body.json` value from the schema using `ExampleGenerator`, useful after importing an OpenAPI spec that had a schema but no example.
   - **"Validate Body"** — validates the current `body.json` against the stored `body.schema.json` and highlights mismatches.

3. **Visual cues** — when a `body.schema.json` exists, the Body tab shows a small schema icon indicator so users know a schema is defined.

#### 4.5.3 Webview Message Handlers

New message types for the Request Tester:

| Message | Direction | Payload |
|---------|-----------|---------|
| `getResponseSchema` | webview → ext | `{ collectionId, requestId }` |
| `responseSchemaLoaded` | ext → webview | `{ schema: ResponseSchemaDefinition }` |
| `saveResponseSchema` | webview → ext | `{ collectionId, requestId, schema }` |
| `inferResponseSchema` | webview → ext | `{ collectionId, requestId }` |
| `responseSchemaInferred` | ext → webview | `{ schema, diff? }` |
| `captureResponse` | webview → ext | `{ collectionId, requestId, response }` |
| `getBodySchema` | webview → ext | `{ collectionId, requestId }` |
| `bodySchemaLoaded` | ext → webview | `{ schema: BodySchemaDefinition }` |
| `saveBodySchema` | webview → ext | `{ collectionId, requestId, schema }` |
| `inferBodySchema` | webview → ext | `{ collectionId, requestId }` |
| `bodySchemaInferred` | ext → webview | `{ schema, diff? }` |
| `generateExampleBody` | webview → ext | `{ collectionId, requestId, bodySchema? }` — `bodySchema` is current editor content (priority); omit to use collection/context lookup |
| `validateBody` | webview → ext | `{ collectionId, requestId }` |
| `bodyValidationResult` | ext → webview | `{ valid: boolean, errors?: string[] }` |

**Files Modified:**
- Request Tester webview HTML/CSS/JS (new tabs — Body Schema + Response Schema)
- Request Tester message handler(s) (new handler class)
- `src/services/openapi/schema-inference-service.ts` (integration)

---

### Phase 6 — Commands & Wiring ✅ COMPLETE

#### 4.6.1 New Commands

| Command ID | Title | Menu Location | When Clause |
|------------|-------|---------------|-------------|
| `httpForge.exportOpenApi` | Export as OpenAPI | Collection context menu, Command Palette | `viewItem == collection` |
| `httpForge.importOpenApi` | Import OpenAPI Spec | Collections view title bar, Command Palette | Always |
| `httpForge.inferResponseSchema` | Infer Response Schema | Request context menu, Command Palette | `viewItem == request` |
| `httpForge.inferAllResponseSchemas` | Infer All Response Schemas | Collection context menu | `viewItem == collection` |

#### 4.6.2 Export Command Flow

```
User: right-click collection → "Export as OpenAPI"
  │
  ▼
Quick Pick: Export Options
  ├── Format: JSON / YAML
  ├── Include inferred responses: Yes / No
  ├── Environments for servers: [multi-select from available]
  └── [Export]
  │
  ▼
Save Dialog: Choose output file location
  │
  ▼
OpenApiExporter.export(collectionId, options)
  │
  ├── Load collection tree (folders + requests)
  ├── Resolve server URLs from environments
  ├── For each request:
  │   ├── Map to OpenAPI operation
  │   ├── Load body.schema.json if exists → requestBody schema
  │   ├── Load response.schema.json if exists
  │   ├── If inferFromHistory: run SchemaInferenceService
  │   └── Map auth, params, body, responses
  ├── Deduplicate component schemas
  └── Serialize to JSON/YAML
  │
  ▼
Write file → Show success message with "Open file" action
```

#### 4.6.3 Import Command Flow

```
User: click "Import OpenAPI Spec" (title bar icon or command palette)
  │
  ▼
File Picker: Select .json / .yaml / .yml file
  │
  ▼
Quick Pick: Import Options
  ├── Collection name: [auto from spec title, editable]
  ├── Create environments from servers: Yes / No
  └── [Import]
  │
  ▼
OpenApiImporter.import(filePath, options)
  │
  ├── Read and parse file (JSON or YAML)
  ├── Resolve all $ref pointers
  ├── Create collection with metadata
  ├── Create folders from tags
  ├── For each operation:
  │   ├── Create request.json
  │   ├── Create body.json (from examples or schema)
  │   ├── Create body.schema.json (from requestBody schema)
  │   ├── Create response.schema.json (from responses)
  │   └── Create scripts/ if needed
  ├── Create environment file with server URLs
  └── Save collection via CollectionService
  │
  ▼
Refresh tree → Show success message
```

#### 4.6.4 Service Registration

In `src/services/service-bootstrap.ts`:

```typescript
// New service identifiers
const ServiceIdentifiers = {
  // ... existing ...
  SchemaInferrer: Symbol('SchemaInferrer'),
  HistoryAnalyzer: Symbol('HistoryAnalyzer'),
  ScriptAnalyzer: Symbol('ScriptAnalyzer'),
  SchemaInferenceService: Symbol('SchemaInferenceService'),
  OpenApiExporter: Symbol('OpenApiExporter'),
  OpenApiImporter: Symbol('OpenApiImporter'),
};
```

**Dependency graph:**

```
SchemaInferrer (no deps)
    ↑
HistoryAnalyzer (← SchemaInferrer, IRequestHistoryService)
ScriptAnalyzer (no deps)
    ↑
SchemaInferenceService (← HistoryAnalyzer, ScriptAnalyzer, SchemaInferrer)
    ↑
OpenApiExporter (← ICollectionService, IEnvironmentConfigService, SchemaInferenceService)
OpenApiImporter (← ICollectionService, IEnvironmentConfigService)
```

#### 4.6.5 New Dependency

Add to `package.json`:

```json
{
  "dependencies": {
    "yaml": "^2.4.0"
  },
  "devDependencies": {
    "@apidevtools/json-schema-ref-parser": "^11.0.0"
  }
}
```

- `yaml` — parse/serialize YAML for import/export (bundled by esbuild)
- `@apidevtools/json-schema-ref-parser` — resolve `$ref` pointers in imported specs (bundled by esbuild)

**Files Modified:**
- `src/shared/constants.ts` (new COMMAND_IDS)
- `package.json` (commands, menus, dependencies)
- `src/extension.ts` (command registration)
- `src/services/service-bootstrap.ts` (service registration)
- `src/services/interfaces/index.ts` (new interface exports)

---

## 5. File Inventory

### New Files

| File | Purpose |
|------|---------|
| `src/services/openapi/schema-inferrer.ts` | JSON Schema inference from sample values |
| `src/services/openapi/history-analyzer.ts` | Response schema inference from execution history |
| `src/services/openapi/script-analyzer.ts` | Response field extraction from post-response scripts |
| `src/services/openapi/schema-inference-service.ts` | Orchestrates all inference sources (response + body) |
| `src/services/openapi/openapi-exporter.ts` | Collection → OpenAPI 3.0 export |
| `src/services/openapi/openapi-importer.ts` | OpenAPI 3.0 → Collection import |
| `src/services/openapi/example-generator.ts` | JSON Schema → example value generator |
| `src/services/openapi/ref-resolver.ts` | `$ref` resolution wrapper |
| `src/services/interfaces/openapi.interface.ts` | Interface definitions for OpenAPI services |
| `resources/response-schema.schema.json` | JSON Schema for `response.schema.json` validation |
| `resources/body-schema.schema.json` | JSON Schema for `body.schema.json` validation |

### Modified Files

| File | Change |
|------|--------|
| `src/shared/types/index.ts` | Add `ResponseSchemaDefinition`, `BodySchemaDefinition`, `ContentDefinition`, `EncodingDefinition`, `PathParamEntry`, extend `KeyValueEntry` (with `deprecated`), extend `CollectionRequest` (with `deprecated`) |
| `src/shared/constants.ts` | Add new `COMMAND_IDS` |
| `src/services/collection/folder-collection-loader.ts` | Read/write `response.schema.json` and `body.schema.json`; handle `PathParamEntry` in `params` |
| `src/services/collection/json-collection-loader.ts` | Handle `responseSchema` and `bodySchema` in JSON format |
| `src/services/service-bootstrap.ts` | Register new services |
| `src/extension.ts` | Register new commands |
| `package.json` | Add commands, menus, dependencies |
| `resources/request.schema.json` | Extend `KeyValueEntry` schema; extend `params` to accept `PathParamEntry` objects |
| Request Tester webview files | New "Body Schema" and "Response Schema" tabs |

---

## 6. Testing Strategy

### Unit Tests

| Test Suite | Scope |
|------------|-------|
| `schema-inferrer.test.ts` | Primitives, nested objects, arrays, nulls (`nullable: true`), mixed types, format detection, schema merging, `readOnly`/`writeOnly` preservation |
| `script-analyzer.test.ts` | All recognized patterns, edge cases (comments, string literals), real script samples from `http-forge-assets` |
| `history-analyzer.test.ts` | Mock history service, multiple samples, status code grouping |
| `openapi-exporter.test.ts` | Full collection export, auth mapping, parameter types, body formats, component dedup, `deprecated` flag, header filtering, cookie parameter splitting, `default` response, multiple content types, `allOf`/`oneOf`/`anyOf` round-trip, `readOnly`/`writeOnly`, multipart `encoding` |
| `openapi-importer.test.ts` | Full spec import, `$ref` resolution, example generation, tag → folder mapping, `deprecated` operations/params, cookie params → header, `default` response, multiple content types, schema composition, `readOnly`/`writeOnly`, multipart `encoding` |
| `example-generator.test.ts` | All JSON Schema types, nested schemas, `$ref`, circular refs, enums |

### Integration Tests

| Test | Description |
|------|-------------|
| **Round-trip** | Export `http-bin-test-collection` → OpenAPI → import back → compare collection structure |
| **Petstore import** | Download official Petstore spec → import → verify 20+ endpoints created correctly |
| **History inference** | Execute requests → run inference → verify schemas match actual response shapes |
| **OpenAPI validation** | Export → validate output against OpenAPI 3.0.3 JSON Schema (official) |
| **Composition round-trip** | Import spec with `allOf`/`oneOf`/`anyOf`/`discriminator` → export → verify composition preserved |
| **Deprecated round-trip** | Import spec with deprecated ops/params → verify flags stored → export → verify `deprecated: true` emitted |
| **Multi-content-type** | Import spec with multiple response/request content types → export → verify all content types present |

### Manual Verification

1. Export → open in [Swagger Editor](https://editor.swagger.io) → verify renders correctly
2. Import → open each request in Request Tester → verify URL, body, auth populated correctly
3. Edit response schema in UI → re-export → verify edits reflected in OpenAPI output

---

## 7. Rollout Plan

| Phase | Contents | Status |
|-------|----------|--------|
| **Phase 1** | Schema storage (`response.schema.json`, extended types, loaders) | ✅ Complete |
| **Phase 2** | Schema inference engine (inferrer + history + scripts) | ✅ Complete |
| **Phase 3** | OpenAPI export (full exporter + commands) | ✅ Complete |
| **Phase 4** | OpenAPI import (full importer + `$ref` + examples + commands) | ✅ Complete |
| **Phase 5** | Schema editor UI (webview tab + message handlers) | ✅ Complete |
| **Phase 6** | Wiring, DI, testing, polish | ✅ Complete |

**Implementation order used:** Phase 1 → 2 → 3 → 4 → 6 → 5

### Implementation Notes

- **Phase 5 bug fixes applied:** History inference now uses the correct `requestPath` (with folder path) and active `environment` via `contextProvider.getHistoryStoragePath()` instead of bare `collectionId` and default `'default'` environment. Body inference reads live editor data and `sentRequest` body (with variables resolved) rather than the saved collection body. Variable placeholders (`{{var}}`) are resolved to dummy values before JSON parsing. The "Capture Last Response" feature correctly reads `response.status` (not `statusCode`).
- **Inline metadata editing:** Params, headers, and query parameter rows include expandable metadata panels for editing `type`, `description`, `required`, `format`, `enum`, and `deprecated` fields — enabling OpenAPI-quality annotations directly in the Request Tester UI.
- **Dirty detection:** Body Schema and Response Schema changes are tracked in the save snapshot and properly enable the Save button.

---

## 8. Future Enhancements

| Enhancement | Description |
|-------------|-------------|
| **Auto-infer on execution** | After each request execution, optionally auto-update `response.schema.json` |
| **Schema diff on re-infer** | Show a diff view when re-inferring schemas, letting users accept/reject changes |
| **OpenAPI 3.1 support** | Upgrade from 3.0.3 to 3.1 (aligns with JSON Schema draft 2020-12) |
| **Webhook support** | Map callback-style requests to OpenAPI webhooks |
| **Schema validation** | Validate actual responses against stored schemas during test runs |
| **Collection-level components** | Shared `components/` directory at collection root for reusable schemas |
| **Multiple spec export** | Export specific folders as separate specs or merge multiple collections |
| **Postman export with schemas** | Enhance existing Postman export to include response examples from `response.schema.json` |
