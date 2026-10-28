# HTTP Forge - Design Document

**Version:** 1.0  
**Date:** December 31, 2024  
**Author:** HTTP Forge Team

---

## 1. System Overview

### 1.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          HTTP Forge VS Code Extension                        │
├──────────────────────────────────┬──────────────────────────────────────────┤
│         Extension Host           │              Webview Panels               │
│                                  │                                          │
│  ┌────────────────────────────┐  │  ┌──────────────────────────────────────┐│
│  │    Collection Service      │  │  │         Request Tester               ││
│  │    - Load/Save JSON        │◄─┼─►│  - Collection Tree                   ││
│  │    - CRUD operations       │  │  │  - Request Panel                     ││
│  └────────────────────────────┘  │  │  - Response Panel                    ││
│                                  │  └──────────────────────────────────────┘│
│  ┌────────────────────────────┐  │                                          │
│  │    Cookie Service          │  │  ┌──────────────────────────────────────┐│
│  │    - Cookie jar storage    │◄─┼─►│       Collection Runner              ││
│  │    - Domain-based          │  │  │  - Batch execution                   ││
│  └────────────────────────────┘  │  │  - Results display                   ││
│                                  │  └──────────────────────────────────────┘│
│  ┌────────────────────────────┐  │                                          │
│  │  HTTP Request Service      │  │  ┌──────────────────────────────────────┐│
│  │    - HTTP client           │◄─┼─►│      request-tester-core (Shared)    ││
│  │    - Cookie handling       │  │  │  - Script Engine                     ││
│  │    - Redirect handling     │  │  │  - Variable Resolver                 ││
│  └────────────────────────────┘  │  │  - Form Manager                      ││
│                                  │  │  - Response Handler                  ││
│  ┌────────────────────────────┐  │  │  - Console Capture                   ││
│  │  Environment Service       │  │  │  - Test Results                      ││
│  │    - Variable management   │◄─┼─►│  - Cookie Manager (client)           ││
│  └────────────────────────────┘  │  └──────────────────────────────────────┘│
└──────────────────────────────────┴──────────────────────────────────────────┘
```

### 1.2 Module Dependency Graph

```
                    ┌─────────────────┐
                    │   main.js       │
                    │ (Entry Point)   │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐
    │ Collection  │  │  Request    │  │  Response       │
    │ Tree        │  │  Panel      │  │  Panel          │
    └──────┬──────┘  └──────┬──────┘  └────────┬────────┘
           │                │                   │
           │                │                   │
           ▼                ▼                   ▼
    ┌──────────────────────────────────────────────────┐
    │              http-tester-core                     │
    ├──────────────────────────────────────────────────┤
    │  ┌──────────────┐  ┌──────────────┐              │
    │  │script-engine │  │variable-     │              │
    │  │              │  │resolver      │              │
    │  └──────────────┘  └──────────────┘              │
    │  ┌──────────────┐  ┌──────────────┐              │
    │  │form-manager  │  │response-     │              │
    │  │              │  │handler       │              │
    │  └──────────────┘  └──────────────┘              │
    │  ┌──────────────┐  ┌──────────────┐              │
    │  │console-      │  │test-results  │              │
    │  │capture       │  │              │              │
    │  └──────────────┘  └──────────────┘              │
    │  ┌──────────────┐  ┌──────────────┐              │
    │  │cookie-       │  │collection-   │              │
    │  │manager       │  │runner        │              │
    │  └──────────────┘  └──────────────┘              │
    └──────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
agl-essentials/
├── collections/                           # Collection storage
│   ├── .gitkeep
│   └── example-collection.json
│
├── docs/
│   └── http-api-tester/
│       ├── REQUIREMENTS.md
│       └── DESIGN.md                      # This document
│
├── resources/features/
│   ├── http-tester-core/                  # NEW: Shared modules
│   │   ├── modules/
│   │   │   ├── index.js                   # Re-exports all modules
│   │   │   ├── agl-object.js              # MOVED from endpoint-tester
│   │   │   ├── console-capture.js         # MOVED
│   │   │   ├── expect-chain.js            # MOVED
│   │   │   ├── form-manager.js            # MOVED (generalized)
│   │   │   ├── request-builder.js         # MOVED (generalized)
│   │   │   ├── response-handler.js        # MOVED
│   │   │   ├── script-runner.js           # MOVED (enhanced)
│   │   │   ├── state.js                   # MOVED (generalized)
│   │   │   ├── test-results.js            # MOVED
│   │   │   ├── url-builder.js             # MOVED
│   │   │   ├── utils.js                   # MOVED
│   │   │   ├── cookie-manager.js          # NEW: Cookie jar client
│   │   │   ├── collection-runner.js       # NEW: Run collections
│   │   │   └── variable-resolver.js       # NEW: Unified var resolution
│   │   └── styles/
│   │       └── common.css                 # Shared styles
│   │
│   ├── endpoint-tester/                   # EXISTING (refactored)
│   │   ├── modules/
│   │   │   ├── main.js                    # Imports from core
│   │   │   ├── elements.js                # Endpoint-specific elements
│   │   │   └── history-manager.js         # Endpoint history (kept here)
│   │   ├── index.html
│   │   ├── style.css
│   │   └── bundle.js
│   │
│   └── http-api-tester/                   # NEW: Generic API tester
│       ├── modules/
│       │   ├── main.js                    # Imports from core
│       │   ├── elements.js                # Tester-specific elements
│       │   ├── collection-tree.js         # Tree view component
│       │   ├── collection-manager.js      # Collection CRUD
│       │   ├── request-panel.js           # Request editing
│       │   ├── context-menu.js            # Right-click menus
│       │   ├── drag-drop.js               # Reordering
│       │   └── postman-importer.js        # Import/transform
│       ├── index.html
│       ├── style.css
│       └── bundle.js
│
├── src/
│   ├── services/
│   │   ├── collection-service.ts          # NEW: Collection file I/O
│   │   ├── cookie-service.ts              # NEW: Cookie storage
│   │   ├── request-executor-service.ts    # EXISTING (enhanced)
│   │   └── env-config-service.ts          # EXISTING (unchanged)
│   │
│   └── webview-panels/
│       ├── endpoint-tester-panel.ts       # EXISTING (add pre-flight)
│       └── http-api-tester-panel.ts       # NEW: Generic tester panel
│
└── esbuild.js                             # Update for new bundles
```

---

## 3. Data Models

### 3.1 Collection Format (Postman v2.1 Compatible)

```typescript
interface Collection {
  info: {
    _postman_id?: string;          // UUID
    name: string;
    description?: string;
    schema: string;                // "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  };
  
  variable?: Variable[];           // Collection-level variables
  
  auth?: Auth;                     // Collection-level auth
  
  event?: Event[];                 // Collection-level scripts
  
  item: (Folder | Request)[];      // Contents
}

interface Folder {
  name: string;
  description?: string;
  item: (Folder | Request)[];      // Nested items
  auth?: Auth;                     // Folder-level auth
  event?: Event[];                 // Folder-level scripts
}

interface Request {
  name: string;
  request: {
    method: string;
    url: string | Url;
    header?: Header[];
    body?: Body;
    auth?: Auth;
    description?: string;
  };
  response?: SavedResponse[];      // Example responses
  event?: Event[];                 // Request-level scripts
}

interface Variable {
  key: string;
  value: string;
  type?: string;                   // "string", "number", etc.
  description?: string;
}

interface Event {
  listen: "prerequest" | "test";
  script: {
    type: "text/javascript";
    exec: string[];                // Lines of code
  };
}

interface Auth {
  type: "bearer" | "basic" | "apikey" | "oauth2" | "noauth" | "inherit";
  bearer?: { key: string; value: string }[];
  basicAuth?: { username: string; password: string };
  apikey?: { key: string; value: string; addTo: "header" | "query" };
  oauth2?: OAuth2Config;
}

interface Header {
  key: string;
  value: string;
  disabled?: boolean;
  description?: string;
}

interface Body {
  mode: "raw" | "formdata" | "urlencoded" | "none";
  raw?: string;
  options?: {
    raw?: { language: "json" | "xml" | "text" };
  };
}

interface Url {
  raw: string;
  protocol?: string;
  host?: string[];
  path?: string[];
  query?: { key: string; value: string; disabled?: boolean }[];
}
```

### 3.2 Cookie Storage Format

```typescript
interface CookieJar {
  cookies: {
    [domain: string]: Cookie[];
  };
  lastUpdated: number;
}

interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;                // Unix timestamp
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}
```

### 3.3 Collection Run Result

```typescript
interface CollectionRunResult {
  success: boolean;
  collectionName: string;
  startTime: number;
  endTime: number;
  duration: number;
  
  summary: {
    total: number;
    executed: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  
  iterations: IterationResult[];   // For multi-iteration runs
  
  cookies: Cookie[];               // Cookies set during run
  variables: Record<string, any>; // Variables set during run
}

interface IterationResult {
  requests: RequestResult[];
}

interface RequestResult {
  name: string;
  path: string;                    // e.g., "Auth/Login"
  request: {
    method: string;
    url: string;
  };
  response: {
    status: number;
    statusText: string;
    duration: number;
    size: number;
  };
  tests: {
    name: string;
    passed: boolean;
    error?: string;
  }[];
  error?: string;
}
```

---

## 4. Component Design

### 4.1 Collection Tree Component

```
┌─────────────────────────────────────┐
│ Collections                      [+]│  ← New collection button
├─────────────────────────────────────┤
│ ▼ 📁 My API Collection           ⋮ │  ← Context menu
│   ├── 📁 Auth                    ⋮ │
│   │   ├── 🟢 GET Health            │
│   │   ├── 🔵 POST Login            │
│   │   └── 🔵 POST Refresh          │
│   ├── 📁 Users                     │
│   │   └── 🟢 GET User              │
│   └── 🟠 PUT Update                │
│                                     │
│ ▶ 📁 Another Collection            │  ← Collapsed
│                                     │
│ [📥 Import]                        │
└─────────────────────────────────────┘
```

**State Management:**
```typescript
interface TreeState {
  collections: Collection[];
  expandedNodes: Set<string>;      // node IDs
  selectedNode: string | null;
  dragSource: string | null;
  dropTarget: string | null;
}
```

**Event Handlers:**
- `onNodeClick(nodeId)` - Select and load request
- `onNodeDoubleClick(nodeId)` - Rename inline
- `onNodeExpand(nodeId)` - Toggle expand
- `onContextMenu(nodeId, event)` - Show context menu
- `onDragStart(nodeId)` - Begin drag
- `onDrop(targetId)` - Complete reorder

### 4.2 Request Panel Component

```
┌─────────────────────────────────────────────────────────────────────┐
│ [GET ▼] [https://api.example.com/users/{{userId}}    ] [Send] [Save]│
├─────────────────────────────────────────────────────────────────────┤
│ [Params] [Auth] [Headers] [Body] [Scripts] [Settings]               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Query Parameters                                                   │
│  ┌───┬─────────────┬────────────────────────────────────┐          │
│  │ ☑ │ include     │ profile                            │ [×]      │
│  │ ☐ │ limit       │ 10                                 │ [×]      │
│  └───┴─────────────┴────────────────────────────────────┘          │
│  [+ Add Parameter]                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**URL Parsing:**
```typescript
function parseUrl(rawUrl: string): ParsedUrl {
  const url = new URL(rawUrl);
  return {
    protocol: url.protocol,
    host: url.host,
    path: url.pathname,
    query: Array.from(url.searchParams.entries())
  };
}

function buildUrl(parts: ParsedUrl, params: Param[]): string {
  const url = new URL(`${parts.protocol}//${parts.host}${parts.path}`);
  params.filter(p => p.enabled).forEach(p => {
    url.searchParams.set(p.key, p.value);
  });
  return url.toString();
}
```

### 4.3 Test Suite Component (replaces Collection Runner)

**Script API Additions:**
```javascript
// In agl-object.js - add to createAglObject()

const agl = {
  // ... existing API ...
  
  /**
   * Run an entire collection
   * @param {string} collectionName - Name of the collection
   * @param {object} options - Run options
   * @returns {Promise<CollectionRunResult>}
   */
  runCollection: async (collectionName, options = {}) => {
    return new Promise((resolve, reject) => {
      const requestId = generateId();
      
      // Register callback
      pendingCollectionRuns[requestId] = { resolve, reject };
      
      // Send to extension
      vscode.postMessage({
        command: 'runCollection',
        requestId,
        collectionName,
        options: {
          folder: options.folder,
          stopOnError: options.stopOnError ?? true,
          delay: options.delay ?? 0,
          timeout: options.timeout ?? 30000
        }
      });
    });
  },
  
  /**
   * Run a single request from a collection
   * @param {string} collectionName - Name of the collection
   * @param {string} requestPath - Path to request (e.g., "Auth/Login")
   * @returns {Promise<Response>}
   */
  runRequest: async (collectionName, requestPath) => {
    return new Promise((resolve, reject) => {
      const requestId = generateId();
      
      pendingCollectionRuns[requestId] = { resolve, reject };
      
      vscode.postMessage({
        command: 'runRequest',
        requestId,
        collectionName,
        requestPath
      });
    });
  },
  
  /**
   * Cookie management
   */
  cookies: {
    get: (name, domain) => cookieJar.get(name, domain),
    set: (name, value, options) => cookieJar.set(name, value, options),
    getAll: (domain) => cookieJar.getAll(domain),
    has: (name, domain) => cookieJar.has(name, domain),
    clear: (domain) => cookieJar.clear(domain)
  }
};
```

---

## 5. Service Design

### 5.1 Collection Service

```typescript
// src/services/collection-service.ts

export class CollectionService {
  private collectionsPath: string;
  private collections: Map<string, Collection> = new Map();
  
  constructor(workspaceRoot: string) {
    this.collectionsPath = path.join(workspaceRoot, 'agl-essentials', 'collections');
  }
  
  /**
   * Load all collections from disk
   */
  async loadAllCollections(): Promise<Collection[]> {
    const files = await fs.readdir(this.collectionsPath);
    const collections: Collection[] = [];
    
    for (const file of files.filter(f => f.endsWith('.json'))) {
      const content = await fs.readFile(
        path.join(this.collectionsPath, file), 
        'utf-8'
      );
      const collection = JSON.parse(content);
      this.collections.set(collection.info.name, collection);
      collections.push(collection);
    }
    
    return collections;
  }
  
  /**
   * Save collection to disk
   */
  async saveCollection(collection: Collection): Promise<void> {
    const filename = this.sanitizeFilename(collection.info.name) + '.json';
    const filepath = path.join(this.collectionsPath, filename);
    
    await fs.writeFile(
      filepath,
      JSON.stringify(collection, null, 2),
      'utf-8'
    );
    
    this.collections.set(collection.info.name, collection);
  }
  
  /**
   * Find request by path (e.g., "Auth/Login")
   */
  findRequest(collectionName: string, requestPath: string): Request | null {
    const collection = this.collections.get(collectionName);
    if (!collection) return null;
    
    const parts = requestPath.split('/');
    let items = collection.item;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const folder = items.find(item => 
        'item' in item && item.name === parts[i]
      );
      if (!folder || !('item' in folder)) return null;
      items = folder.item;
    }
    
    return items.find(item => 
      'request' in item && item.name === parts[parts.length - 1]
    ) as Request | null;
  }
  
  /**
   * Get all requests in execution order
   */
  getRequestsInOrder(collection: Collection, folder?: string): Request[] {
    const requests: Request[] = [];
    
    const traverse = (items: (Folder | Request)[], currentPath = '') => {
      for (const item of items) {
        if ('item' in item) {
          // It's a folder
          if (!folder || item.name === folder || currentPath.startsWith(folder)) {
            traverse(item.item, `${currentPath}${item.name}/`);
          }
        } else if ('request' in item) {
          // It's a request
          if (!folder || currentPath.startsWith(folder + '/')) {
            requests.push(item);
          }
        }
      }
    };
    
    traverse(collection.item);
    return requests;
  }
}
```

### 5.2 Cookie Service

```typescript
// src/services/cookie-service.ts

export class CookieService {
  private cookieJar: CookieJar = { cookies: {}, lastUpdated: Date.now() };
  private context: vscode.ExtensionContext;
  
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.load();
  }
  
  /**
   * Load cookies from workspace state
   */
  private async load(): Promise<void> {
    const stored = this.context.workspaceState.get<CookieJar>('cookieJar');
    if (stored) {
      this.cookieJar = stored;
      this.cleanExpired();
    }
  }
  
  /**
   * Save cookies to workspace state
   */
  private async save(): Promise<void> {
    this.cookieJar.lastUpdated = Date.now();
    await this.context.workspaceState.update('cookieJar', this.cookieJar);
  }
  
  /**
   * Set cookie from Set-Cookie header
   */
  setCookieFromHeader(setCookieHeader: string, requestUrl: string): void {
    const parsed = this.parseSetCookie(setCookieHeader, requestUrl);
    if (!parsed) return;
    
    const domain = parsed.domain || new URL(requestUrl).hostname;
    
    if (!this.cookieJar.cookies[domain]) {
      this.cookieJar.cookies[domain] = [];
    }
    
    // Replace existing cookie with same name
    const idx = this.cookieJar.cookies[domain].findIndex(
      c => c.name === parsed.name
    );
    
    if (idx >= 0) {
      this.cookieJar.cookies[domain][idx] = parsed;
    } else {
      this.cookieJar.cookies[domain].push(parsed);
    }
    
    this.save();
  }
  
  /**
   * Get cookies for a request URL
   */
  getCookiesForUrl(url: string): Cookie[] {
    const hostname = new URL(url).hostname;
    const result: Cookie[] = [];
    
    for (const [domain, cookies] of Object.entries(this.cookieJar.cookies)) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        result.push(...cookies.filter(c => !this.isExpired(c)));
      }
    }
    
    return result;
  }
  
  /**
   * Format cookies for Cookie header
   */
  getCookieHeader(url: string): string {
    const cookies = this.getCookiesForUrl(url);
    return cookies.map(c => `${c.name}=${c.value}`).join('; ');
  }
  
  /**
   * Clear all cookies
   */
  clear(domain?: string): void {
    if (domain) {
      delete this.cookieJar.cookies[domain];
    } else {
      this.cookieJar.cookies = {};
    }
    this.save();
  }
}
```

### 5.3 Test Suite Service (replaces Collection Runner Service)

```typescript
// Part of request-executor-service.ts or separate file

export class TestSuiteService {
  constructor(
    private collectionService: CollectionService,
    private cookieService: CookieService,
    private requestExecutor: RequestExecutorService,
    private envService: EnvConfigService
  ) {}
  
  /**
   * Run a collection
   */
  async runCollection(
    collectionName: string,
    options: RunOptions
  ): Promise<CollectionRunResult> {
    const collection = this.collectionService.getCollection(collectionName);
    if (!collection) {
      throw new Error(`Collection not found: ${collectionName}`);
    }
    
    const requests = this.collectionService.getRequestsInOrder(
      collection, 
      options.folder
    );
    
    const result: CollectionRunResult = {
      success: true,
      collectionName,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      summary: {
        total: requests.length,
        executed: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      },
      iterations: [{ requests: [] }],
      cookies: [],
      variables: {}
    };
    
    // Get scripts from collection and folders
    const collectionScripts = this.extractScripts(collection);
    
    for (const request of requests) {
      try {
        // Run pre-request scripts (collection → folder → request)
        await this.runPreRequestScripts(request, collectionScripts);
        
        // Execute request
        const response = await this.executeRequest(request, options);
        
        // Run post-response scripts
        const testResults = await this.runPostResponseScripts(
          request, 
          response, 
          collectionScripts
        );
        
        // Record result
        result.iterations[0].requests.push({
          name: request.name,
          path: this.getRequestPath(request, collection),
          request: {
            method: request.request.method,
            url: this.resolveUrl(request.request.url)
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            duration: response.duration,
            size: response.size
          },
          tests: testResults
        });
        
        result.summary.executed++;
        
        if (testResults.every(t => t.passed)) {
          result.summary.passed++;
        } else {
          result.summary.failed++;
          result.success = false;
          
          if (options.stopOnError) {
            result.summary.skipped = requests.length - result.summary.executed;
            break;
          }
        }
        
        // Delay between requests
        if (options.delay && options.delay > 0) {
          await this.delay(options.delay);
        }
        
      } catch (error) {
        result.summary.executed++;
        result.summary.failed++;
        result.success = false;
        
        result.iterations[0].requests.push({
          name: request.name,
          path: this.getRequestPath(request, collection),
          request: { method: request.request.method, url: '' },
          response: { status: 0, statusText: '', duration: 0, size: 0 },
          tests: [],
          error: error.message
        });
        
        if (options.stopOnError) {
          result.summary.skipped = requests.length - result.summary.executed;
          break;
        }
      }
    }
    
    result.endTime = Date.now();
    result.duration = result.endTime - result.startTime;
    result.cookies = this.cookieService.getAllCookies();
    
    return result;
  }
}
```

---

## 6. Script Transformation

### 6.1 Postman to AGL Mapping

| Postman API | AGL Equivalent | Notes |
|-------------|----------------|-------|
| `pm.environment.get(key)` | `agl.env.get(key)` | |
| `pm.environment.set(key, val)` | `agl.env.set(key, val)` | |
| `pm.environment.unset(key)` | `agl.env.unset(key)` | |
| `pm.globals.get(key)` | `agl.env.get(key)` | Mapped to env |
| `pm.globals.set(key, val)` | `agl.env.set(key, val)` | Mapped to env |
| `pm.collectionVariables.get(key)` | `agl.variables.get(key)` | |
| `pm.collectionVariables.set(key, val)` | `agl.variables.set(key, val)` | |
| `pm.variables.get(key)` | `agl.variables.get(key)` | |
| `pm.request.url` | `agl.request.url` | |
| `pm.request.headers` | `agl.request.headers` | |
| `pm.request.body` | `agl.request.body` | |
| `pm.request.method` | `agl.request.method` | |
| `pm.response.json()` | `agl.response.json()` | |
| `pm.response.text()` | `agl.response.text()` | |
| `pm.response.code` | `agl.response.status` | |
| `pm.response.status` | `agl.response.statusText` | |
| `pm.response.responseTime` | `agl.response.time` | |
| `pm.response.headers` | `agl.response.headers` | |
| `pm.test(name, fn)` | `agl.test(name, fn)` | |
| `pm.expect(val)` | `agl.expect(val)` | |
| `pm.cookies.get(name)` | `agl.cookies.get(name)` | |
| `pm.cookies.has(name)` | `agl.cookies.has(name)` | |
| `pm.sendRequest(...)` | `agl.runRequest(...)` | Different signature |

### 6.2 Transformer Implementation

```typescript
// postman-importer.js

export function transformPostmanScript(script: string): TransformResult {
  const warnings: string[] = [];
  let transformed = script;
  
  // Simple replacements
  const replacements: [RegExp, string][] = [
    [/pm\.environment\.get/g, 'agl.env.get'],
    [/pm\.environment\.set/g, 'agl.env.set'],
    [/pm\.environment\.unset/g, 'agl.env.unset'],
    [/pm\.globals\.get/g, 'agl.env.get'],
    [/pm\.globals\.set/g, 'agl.env.set'],
    [/pm\.collectionVariables\.get/g, 'agl.variables.get'],
    [/pm\.collectionVariables\.set/g, 'agl.variables.set'],
    [/pm\.variables\.get/g, 'agl.variables.get'],
    [/pm\.request\.url/g, 'agl.request.url'],
    [/pm\.request\.headers/g, 'agl.request.headers'],
    [/pm\.request\.body/g, 'agl.request.body'],
    [/pm\.request\.method/g, 'agl.request.method'],
    [/pm\.response\.json\(\)/g, 'agl.response.json()'],
    [/pm\.response\.text\(\)/g, 'agl.response.text()'],
    [/pm\.response\.code/g, 'agl.response.status'],
    [/pm\.response\.status/g, 'agl.response.statusText'],
    [/pm\.response\.responseTime/g, 'agl.response.time'],
    [/pm\.response\.headers/g, 'agl.response.headers'],
    [/pm\.test/g, 'agl.test'],
    [/pm\.expect/g, 'agl.expect'],
    [/pm\.cookies\.get/g, 'agl.cookies.get'],
    [/pm\.cookies\.has/g, 'agl.cookies.has'],
  ];
  
  for (const [pattern, replacement] of replacements) {
    transformed = transformed.replace(pattern, replacement);
  }
  
  // Warn about unsupported features
  const unsupported = [
    { pattern: /pm\.sendRequest/g, feature: 'pm.sendRequest' },
    { pattern: /pm\.visualizer/g, feature: 'pm.visualizer' },
    { pattern: /pm\.execution/g, feature: 'pm.execution' },
    { pattern: /pm\.iterationData/g, feature: 'pm.iterationData' },
  ];
  
  for (const { pattern, feature } of unsupported) {
    if (pattern.test(script)) {
      warnings.push(`Unsupported feature: ${feature}`);
    }
  }
  
  return { script: transformed, warnings };
}

export function importPostmanCollection(json: string): ImportResult {
  const collection = JSON.parse(json);
  const warnings: string[] = [];
  
  // Transform all scripts
  const transformScripts = (events?: Event[]) => {
    if (!events) return;
    
    for (const event of events) {
      if (event.script?.exec) {
        const code = event.script.exec.join('\n');
        const result = transformPostmanScript(code);
        event.script.exec = result.script.split('\n');
        warnings.push(...result.warnings);
      }
    }
  };
  
  // Process collection-level scripts
  transformScripts(collection.event);
  
  // Process all items recursively
  const processItems = (items: (Folder | Request)[]) => {
    for (const item of items) {
      transformScripts(item.event);
      
      if ('item' in item) {
        processItems(item.item);
      }
    }
  };
  
  processItems(collection.item);
  
  return {
    collection,
    warnings: [...new Set(warnings)] // Deduplicate
  };
}
```

---

## 7. Message Protocol

### 7.1 Webview → Extension

```typescript
// Collection operations
{ command: 'loadCollections' }
{ command: 'saveCollection', collection: Collection }
{ command: 'deleteCollection', name: string }
{ command: 'importCollection', json: string }
{ command: 'exportCollection', name: string }

// Request execution
{ command: 'sendRequest', request: RequestData }
{ command: 'cancelRequest' }
{ command: 'runCollection', requestId: string, collectionName: string, options: RunOptions }
{ command: 'runRequest', requestId: string, collectionName: string, requestPath: string }

// Cookie management
{ command: 'getCookies', domain?: string }
{ command: 'clearCookies', domain?: string }

// Environment
{ command: 'changeEnvironment', environment: string }
{ command: 'openEnvironmentEditor' }
```

### 7.2 Extension → Webview

```typescript
// Initial data
{ command: 'init', data: { collections, environments, selectedEnvironment, cookies } }

// Collection updates
{ command: 'collectionsLoaded', collections: Collection[] }
{ command: 'collectionSaved', name: string }
{ command: 'collectionDeleted', name: string }
{ command: 'importResult', collection: Collection, warnings: string[] }

// Request results
{ command: 'requestComplete', data: { response, cookies } }
{ command: 'requestError', error: string }
{ command: 'collectionRunComplete', requestId: string, result: CollectionRunResult }

// Cookie updates
{ command: 'cookiesUpdated', cookies: Cookie[] }

// Environment
{ command: 'environmentChanged', data: { selectedEnvironment, resolvedEnvironment } }
```

---

## 8. UI Wireframes

### 8.1 Main Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HTTP API Tester                                              [Env: dev ▼]   │
├────────────────────────┬────────────────────────────────────────────────────┤
│ Collections         [+]│ ┌────────────────────────────────────────────────┐ │
│ ─────────────────────  │ │[POST ▼][https://{{baseUrl}}/api/login ] [Send] │ │
│ ▼ 📁 My API            │ ├────────────────────────────────────────────────┤ │
│   ├── 📁 Auth          │ │[Params][Auth][Headers][Body][Scripts][Settings]│ │
│   │   ├── 🔵 Login     │ ├────────────────────────────────────────────────┤ │
│   │   └── 🔵 Refresh   │ │                                                │ │
│   └── 📁 Users         │ │  Headers                                       │ │
│       └── 🟢 Get User  │ │  ☑ Content-Type   application/json        [×]  │ │
│                        │ │  ☑ Authorization  Bearer {{token}}        [×]  │ │
│ ▶ 📁 Another           │ │  [+ Add Header]                                │ │
│                        │ │                                                │ │
│ ─────────────────────  │ ├────────────────────────────────────────────────┤ │
│ [📥 Import]            │ │ Response                    200 OK  ⏱ 245ms   │ │
│                        │ │ [Body] [Headers] [Cookies]                     │ │
│                        │ │ ┌────────────────────────────────────────────┐ │ │
│                        │ │ │ {                                          │ │ │
│                        │ │ │   "token": "eyJhbGciOiJIUzI1...",         │ │ │
│                        │ │ │   "user": {                                │ │ │
│                        │ │ │     "id": 123,                             │ │ │
│                        │ │ │     "name": "John"                         │ │ │
│                        │ │ │   }                                        │ │ │
│                        │ │ │ }                                          │ │ │
│                        │ │ └────────────────────────────────────────────┘ │ │
│                        │ └────────────────────────────────────────────────┘ │
└────────────────────────┴────────────────────────────────────────────────────┘
```

### 8.2 Context Menu

```
┌─────────────────────┐
│ Add Request         │
│ Add Folder          │
├─────────────────────┤
│ Rename              │
│ Duplicate           │
│ Delete              │
├─────────────────────┤
│ Run Collection      │
│ Export              │
└─────────────────────┘
```

### 8.3 Save Request Dialog

```
┌─────────────────────────────────────────────┐
│ Save Request                            [×] │
├─────────────────────────────────────────────┤
│ Name:                                       │
│ ┌─────────────────────────────────────────┐ │
│ │ Get User Profile                        │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Collection:                                 │
│ ┌─────────────────────────────────────┬───┐ │
│ │ My API Collection                   │ ▼ │ │
│ └─────────────────────────────────────┴───┘ │
│                                             │
│ Folder:                                     │
│ ┌─────────────────────────────────────┬───┐ │
│ │ Users                               │ ▼ │ │
│ └─────────────────────────────────────┴───┘ │
│ [ ] Create new folder: ________________     │
│                                             │
│              [Cancel]  [Save]               │
└─────────────────────────────────────────────┘
```

### 8.4 Collection Run Progress

```
┌─────────────────────────────────────────────┐
│ Running: My API Collection                  │
├─────────────────────────────────────────────┤
│ ████████████░░░░░░░░░░░░░░░░  3/8           │
│                                             │
│ ✓ Auth/Login                    234ms       │
│ ✓ Auth/Refresh                  156ms       │
│ ► Users/Get User                ...         │
│ ○ Users/Update User                         │
│ ○ Users/Delete User                         │
│ ○ Content/Get Content                       │
│ ○ Content/Create Content                    │
│ ○ Health Check                              │
│                                             │
│              [Stop]                         │
└─────────────────────────────────────────────┘
```

---

## 9. Implementation Phases

### Phase 1: Core Extraction (Week 1)
- [ ] Create `http-tester-core/` directory structure
- [ ] Move shared modules from endpoint-tester
- [ ] Generalize modules (remove endpoint-specific logic)
- [ ] Update endpoint-tester to import from core
- [ ] Update esbuild configuration
- [ ] Verify endpoint-tester still works

### Phase 2: Basic HTTP API Tester (Week 1-2)
- [ ] Create http-api-tester panel skeleton
- [ ] Implement free-form URL input
- [ ] Implement request execution (reuse core)
- [ ] Implement response display (reuse core)
- [ ] Register command and menu item

### Phase 3: Collection Management (Week 2-3)
- [ ] Implement CollectionService
- [ ] Create collection tree component
- [ ] Implement collection CRUD
- [ ] Implement folder CRUD
- [ ] Implement request CRUD
- [ ] Add context menus
- [ ] Add save request dialog

### Phase 4: Cookie & Test Suite (Week 3-4)
- [ ] Implement CookieService
- [ ] Implement cookie-manager.js (client)
- [ ] Add `agl.cookies.*` API
- [ ] Implement TestSuiteService (replaces CollectionRunnerService)
- [ ] Add cross-collection request selection
- [ ] Add performance statistics (P50/P90/P95/P99)
- [ ] Add suite save/load functionality

### Phase 5: Import/Export (Week 4)
- [ ] Implement Postman importer
- [ ] Implement script transformer
- [ ] Add import UI
- [ ] Add export functionality
- [ ] Handle edge cases and warnings

### Phase 6: Polish (Week 5)
- [ ] Drag and drop reordering
- [ ] Keyboard shortcuts
- [ ] Collection variables UI
- [ ] Collection run UI
- [ ] Error handling improvements
- [ ] Documentation

---

## 10. Testing Strategy

### 10.1 Unit Tests
- Script transformer
- URL parser/builder
- Variable resolver
- Cookie service

### 10.2 Integration Tests
- Collection CRUD operations
- Request execution with cookies
- Test Suite execution
- Performance statistics calculation
- Postman import

### 10.3 Manual Tests
- UI interactions
- Drag and drop
- Context menus
- Cross-panel communication

---

## 11. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking endpoint-tester during refactor | High | Incremental changes, thorough testing |
| Postman format changes | Medium | Version detection, graceful degradation |
| Complex script transformation | Medium | Warn on unsupported features |
| Performance with large collections | Medium | Lazy loading, virtualization |

---

## 12. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-18 | AGL Team | Initial design |
