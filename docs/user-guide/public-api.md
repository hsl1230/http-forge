# Public API for Extensions

HTTP Forge exposes a public API for other VS Code extensions (for example, `agl-essentials`). This allows third‑party extensions to open the Request Tester, resolve environments, execute requests, and access collections.

## Get the API
```ts
import * as vscode from 'vscode';

const ext = vscode.extensions.getExtension('henry-huang.http-forge');
if (!ext) throw new Error('HTTP Forge not installed');

const api = ext.exports as HttpForgeApi;
```

## API surface (current)

### Environment management
- `getEnvironmentNames(): string[]`
- `getSelectedEnvironment(): string`
- `setSelectedEnvironment(name: string): Promise<void>`
- `getResolvedEnvironment(name: string): ResolvedEnvironment | null`
- `resolveVariables(text: string, environmentName?: string): string`

### Collection management
- `getAllCollections(): Collection[]`
- `getCollection(id: string): Collection | undefined`
- `createCollection(name: string): Promise<Collection>`
- `saveCollection(collection: Collection): Promise<void>`
- `deleteCollection(id: string): Promise<boolean>`
- `findRequest(collectionId: string, requestId: string): CollectionItem | undefined`

### HTTP requests
- `executeRequest(options: HttpRequestOptions): Promise<HttpResponse>`
- `buildUrl(environment: ResolvedEnvironment, path: string, params?: Record<string,string>, query?: Record<string,string>): string`

### Request history
- `getRequestHistory(environment: string, requestPath: string, requestId: string): HistoryEntry[]`

### Cookies
- `getAllCookies(): any[]`
- `getCookieHeader(domain: string): string`
- `clearCookies(): Promise<void>`

### UI commands
- `openRequest(collectionId: string, folderPath: string[], request: CollectionItem): void`
- `openRequestContext(context: RequestContextInput): void`
- `openEnvironmentEditor(selectedEnvironment?: string): void`
- `openCollectionEditor(collectionId: string): void`
- `refreshCollections(): void`
- `refreshEnvironments(): void`

## RequestContextInput
Use `openRequestContext()` when you already have a complete request payload (e.g., endpoint testing).

```ts
interface RequestContextInput {
  request: UnifiedRequest;
  readonly?: boolean;
  allowSave?: boolean;
  title?: string;
  collectionId?: string;
  collectionName?: string;
  requestId?: string;
  folderPath?: string;
  group?: { ticket: string | null; branch: string };
}
```

## Example: open the Request Tester with a custom request
```ts
api.openRequestContext({
  title: 'Ad‑hoc Request',
  readonly: false,
  allowSave: true,
  request: {
    id: 'temp-id',
    name: 'Get User',
    method: 'GET',
    path: '{{baseUrl}}/users/:id',
    params: { id: '123' },
    query: { include: 'profile' },
    headers: { Authorization: 'Bearer {{token}}' },
    body: null,
    // Optional: provide schemas for Body Schema / Response Schema tabs
    bodySchema: {
      contentType: 'application/json',
      schema: { type: 'object', properties: { name: { type: 'string' } } }
    },
    responseSchema: {
      responses: {
        '200': { schema: { type: 'object', properties: { id: { type: 'integer' } } }, description: 'OK' },
        '404': { schema: { type: 'object', properties: { error: { type: 'string' } } }, description: 'Not found' }
      }
    }
  }
});
```

## Example: execute a request programmatically
```ts
const env = api.getResolvedEnvironment(api.getSelectedEnvironment());
if (!env) throw new Error('Missing environment');

const url = api.buildUrl(env, '{{baseUrl}}/health');
const response = await api.executeRequest({
  method: 'GET',
  url
});
```

## Notes
- API version is available on `api.version`.
- The public API is intended for VS Code extension integrations.
