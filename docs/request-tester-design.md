# HTTP Forge - Request Tester Design Document

## Overview

The HTTP Forge Request Tester is a Postman-like HTTP API testing tool for Visual Studio Code. It allows developers to test API endpoints with full support for collections, environments, and scripting.

---

## Architecture

### Component Overview

```
┌─────────────────────┐                      ┌─────────────────────┐
│   Collections View  │   Double-click       │   Request Tester    │
│                     │ ──────────────────▶ │                     │
│ - Collection tree   │   (opens request)    │ - Request builder   │
│ - Environments      │                      │ - Send requests     │
│ - Quick actions     │                      │ - View responses    │
└─────────────────────┘                      └─────────────────────┘
```

### Panel Location

- **Activity Bar**: HTTP Forge icon (🔨) shows Collections and Environments views
- **Request Tester**: Opens as a new webview panel when you open a request

### Webview Module Architecture

The Request Tester webview follows SOLID principles with a modular architecture:

```
resources/features/request-tester/modules/
├── main.js                    # Entry point, initialization
├── message-handler.js         # Handle messages from extension
├── state.js                   # Application state management
├── elements.js                # DOM element references
├── request-builder.js         # Build request configuration
├── request-executor.js        # Execute HTTP requests
├── request-loader.js          # Load request data into UI
├── request-saver.js           # Save request to collection
├── response-handler.js        # Handle and display responses
├── url-builder.js             # Build URL with variables
├── form-manager.js            # Manage form inputs
├── query-params-manager.js    # Manage query parameters
├── path-variables-manager.js  # Manage path variables (enum dropdowns, format validation)
├── body-type-manager.js       # Manage request body types
├── monaco-editors-manager.js  # Monaco editor instances
├── history-renderer.js        # Render request history
├── cookie-manager.js          # Manage cookies
├── script-runner.js           # Execute pre/post scripts
├── agl-object.js              # Script API object
├── expect-chain.js            # Fluent assertion API
├── test-results.js            # Test results management
├── console-capture.js         # Capture console output
├── schema-editor-manager.js   # Body Schema & Response Schema editors
├── graphql-manager.js         # GraphQL schema manager (introspection, completions, explorer)
└── oauth2-manager.js          # OAuth 2.0 UI manager
```

---

## Configuration

### File Structure

```
your-workspace/
  └── .http-forge/
      ├── environments.json           ← Shared environments (can be committed)
      ├── environments.local.json     ← Personal credentials (gitignored)
      ├── collections/                ← Request collections
      │   ├── my-api.json
      │   └── auth-tests.json
      └── histories/                  ← Request history (gitignored)
          ├── collection-id/
          │   ├── request-id.json
          │   └── ...
          └── ...
```

### environments.json (Shared)

```json
{
  "environments": {
    "local": {
      "baseUrl": "http://localhost:3000",
      "description": "Local development server",
      "variables": {
        "apiVersion": "v1"
      }
    },
    "dev": {
      "baseUrl": "https://dev-agl.telus.com",
      "description": "Development environment",
      "variables": {
        "propertyName": "optiktv",
        "clientId": "agl-web",
        "locale": "en_CA",
        "testContentId": "12345",
        "testUserId": "user001"
      }
    },
    "sit": {
      "baseUrl": "https://sit-agl.telus.com",
      "description": "System Integration Testing",
      "variables": {
        "propertyName": "optiktv",
        "clientId": "agl-web-sit",
        "locale": "en_CA",
        "testContentId": "67890"
      }
    },
    "preprod": {
      "baseUrl": "https://preprod-agl.telus.com",
      "description": "Pre-production",
      "variables": {}
    },
    "qa": {
      "baseUrl": "https://qa-agl.telus.com",
      "description": "QA environment",
      "variables": {}
    },
    "prod": {
      "baseUrl": "https://prod-agl.telus.com",
      "description": "Production",
      "requiresConfirmation": true,
      "variables": {}
    }
  },
  "globalVariables": {
    "apiVersion": "1.2",
    "platform": "web"
  },
  "defaultHeaders": {
    "Content-Type": "application/json"
  }
}
```

### environments.local.json (Personal, Gitignored)

```json
{
  "credentials": {
    "dev": {
      "headers": {
        "Authorization": "Bearer {{devToken}}"
      }
    },
    "sit": {
      "headers": {
        "Authorization": "Bearer {{sitToken}}"
      }
    }
  },
  "variables": {
    "devToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "sitToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "myTestUser": "john.doe",
    "password": "secret123"
  }
}
```

### .gitignore Entry

```gitignore
# In avs-dev-setup-utils/.gitignore
agl-essentials/*.local.json
agl-essentials/history/
```

---

## Variable System

### Syntax

Use `{{variableName}}` anywhere in inputs (params, headers, body).

### Resolution Order

1. **Local variables** (`environments.local.json` → `variables`)
2. **Environment variables** (`environments.json` → `environments.{env}.variables`)
3. **Global variables** (`environments.json` → `globalVariables`)

### Features

| Feature | Description |
|---------|-------------|
| `{{variable}}` syntax | Works in params, headers, body |
| Autocomplete | Typing `{{` shows available variables |
| Resolved preview | Shows actual URL/values below inputs |
| Highlight | `{{variables}}` shown in different color |
| Undefined warning | Red highlight if variable not found |

### Example Usage

```json
{
  "username": "{{myTestUser}}",
  "propertyName": "{{propertyName}}",
  "deviceId": "{{deviceId}}"
}
```

---

## Endpoint Identification

Each endpoint is uniquely identified by combining:

- `method` - HTTP method (GET, POST, etc.)
- `name` - Version label (e.g., "1.2", "T7.2")
- `description` - Short URI (e.g., "detail/:id")

```typescript
// Example: "GET_1.2_detail/:id"
const endpointId = `${method}_${name}_${description}`;
```

### History Filename

```
history/GET_1.2_detail_id.json
history/POST_1.3_user_login.json
```

---

## Request History

### Storage Structure

Each endpoint has its own history file:

```json
{
  "endpointId": "GET_1.2_detail/:id",
  "method": "GET",
  "requests": [
    {
      "id": "uuid-1",
      "timestamp": 1702656000000,
      "ticket": "AVS5-17837",
      "branch": "bugfix/AVS5-17837-bundles-from-undefined",
      "environment": "dev",
      "params": {
        "contentId": "12345"
      },
      "query": {
        "locale": "en_CA",
        "propertyName": "optiktv"
      },
      "headers": {
        "x-client-id": "agl-web"
      },
      "body": null,
      "response": {
        "status": 200,
        "time": 150
      },
      "note": "Testing bundle fix"
    }
  ]
}
```

### Ticket Extraction from Branch

```typescript
// Pattern: PROJECT-NUMBER (e.g., AVS5-17837, TSQA-41615)
function extractTicketFromBranch(branchName: string): string | null {
  const match = branchName.match(/([A-Z]+-\d+)/);
  return match ? match[1] : null;
}

// Examples:
// "bugfix/AVS5-17837-bundles-from-undefined" → "AVS5-17837"
// "feature/AVS5-18057-merge-back-from-main"  → "AVS5-18057"
// "bugfix/TSQA-41615-match-assetId"          → "TSQA-41615"
// "hotfix/r29_aglcore_7_24_0"                → null (use branch name)
```

### History Filtering

- History is filtered by the **selected environment** (top-right dropdown)
- Only shows requests for the current environment
- Grouped by ticket/branch with current branch at top

---

## User Interface

### Complete Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ AGL Endpoint Tester                                       [dev ▼]  │
├─────────────────────────────────────────────────────────────────────┤
│ GET /content/1.2/detail/:contentId                        [Send]   │
├──────────────────────────────┬──────────────────────────────────────┤
│ History (dev)                │ [Params] [Auth] [Headers] [Body]    │
│ ┌──────────────────────────┐ │                                      │
│ │ 🎫 AVS5-17837 (current)  │ │  Path Variables                      │
│ │  └─ id=12345  ✓ 200      │ │  ┌──────────┬─────────────────────┐  │
│ │     2 min ago  [Use]     │ │  │ contentId│ [{{testContentId}}] │  │
│ │                          │ │  └──────────┴─────────────────────┘  │
│ │ 🎫 TSQA-41615            │ │                                      │
│ │  └─ id=55555  ✓ 200      │ │  Query Params                        │
│ │     yesterday  [Use]     │ │  ┌───┬────────────┬───────────────┐  │
│ │                          │ │  │ ☑ │ locale     │ [{{locale}}__]│  │
│ │ 📁 hotfix/r29_7_24       │ │  │ ☑ │ propertyNm │ [{{property}}]│  │
│ │  └─ id=99999  ✗ 404      │ │  │ ☐ │ + Add      │               │  │
│ │     Dec 10  [Use]        │ │  └───┴────────────┴───────────────┘  │
│ │                          │ │                                      │
│ └──────────────────────────┘ │  Resolved Preview:                   │
│ [◀ Collapse]                 │  /content/1.2/detail/12345?locale=.. │
├──────────────────────────────┴──────────────────────────────────────┤
│ Response                                    200 OK  150ms  [Copy]  │
├─────────────────────────────────────────────────────────────────────┤
│ [Body] [Headers] [Cookies]                                          │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ {                                                               │ │
│ │   "resultCode": "OK",                                           │ │
│ │   "resultObj": { ... }                                          │ │
│ │ }                                                               │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

##### HTML Preview (Rendered)

When the response body is HTML the Body tab supports both a Raw and a Preview view:

- Raw — the HTML source shown in the Monaco editor (read‑only).
- Preview — the rendered document shown inside a sandboxed iframe (injected via srcdoc or document.write fallback).

Behavior and implementation notes:

- Detection: HTML is detected from the response Content-Type header (contains "html") or by a simple heuristic (body text starts with "<").
- Toolbar: a compact Raw / Preview toolbar is shown in the Response → Body header only when the Body tab is active and the last response is HTML.
- Preview readiness: HTML responses populate the iframe immediately so switching to the Body tab displays the preview without delay; the toolbar remains hidden unless the Body tab is selected.
- Security: preview iframe is sandboxed to prevent script execution and to isolate content from the extension host.
- UX: scrollbars inside the preview are styled to match the editor/webview theme for a consistent appearance.


### Request Section Tabs

#### Params Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│ Path Variables (auto-detected from endpoint)                        │
│ ┌────────────────┬─────────────────────────────────┐               │
│ │ contentId      │ [{{testContentId}}____________] │  ← Text input │
│ │ channel        │ [IOS ▼]                         │  ← Select     │
│ │                │  (IOS, ANDROID_TV_BYOD, ...)    │    (enum > 1) │
│ └────────────────┴─────────────────────────────────┘               │
│                                                                     │
│ Path params with enum arrays in their PathParamEntry               │
│ metadata render as select dropdowns. Missing enum renders as a     │
│ renders as a text input. Params metadata (enum, format) takes      │
│ priority over values inferred from URL constraints.                │
│                                                                     │
│ Query Params (auto-detected from flow analysis)                     │
│ ┌───┬────────────────┬─────────────────────────────┐               │
│ │ ☑ │ locale         │ [{{locale}}________________] │               │
│ │ ☑ │ propertyName   │ [{{propertyName}}__________] │               │
│ │ ☑ │ startDeltaTime │ [0_______________________] │               │
│ │ ☐ │ + Add          │                             │               │
│ └───┴────────────────┴─────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

#### Authorization Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│ Type: [Inherit from Environment ▼]                                  │
│                                                                     │
│   ○ Inherit from Environment  ← Uses token from environments.local │
│   ○ Bearer Token              ← Manual token input                  │
│   ○ No Auth                   ← No authorization header             │
│                                                                     │
│ Token (when Bearer selected):                                       │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ {{devToken}}                                                    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

#### Headers Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│ Headers (auto-detected reads from flow analysis)                    │
│ ┌───┬──────────────────┬───────────────────────────────┐           │
│ │ ☑ │ Content-Type     │ [application/json____________] │           │
│ │ ☑ │ x-client-id      │ [{{clientId}}________________] │           │
│ │ ☑ │ x-correlation-id │ [{{$uuid}}_________________] │           │
│ │ ☐ │ + Add            │                               │           │
│ └───┴──────────────────┴───────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

#### Body Tab (Monaco Editor - Editable)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ {                                                               │ │
│ │   "username": "{{myTestUser}}",                                 │ │
│ │   "password": "{{password}}",                                   │ │
│ │   "deviceId": "abc123"                                          │ │
│ │ }                                                               │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ (Monaco editor with JSON syntax highlighting, editable)             │

Note: Mustache template expressions (e.g. `{{name}}`, `{{#section}}...{{/section}}`, `{{{raw}}}`) are highlighted in the editor. The highlighting is applied as an overlay (decorations) so Monaco's native language tokenization and features (folding, validation) are preserved.
└─────────────────────────────────────────────────────────────────────┘
```

#### Settings Tab

Advanced request configuration options (Postman-style):

```
┌─────────────────────────────────────────────────────────────────────┐
│ Request Settings                                                    │
│                                                                     │
│ Request Timeout (ms)                                                │
│ [30000_________]                                                    │
│ Maximum time to wait for response (0 = no timeout)                  │
│                                                                     │
│ ☑ Follow Redirects                                                  │
│   Automatically follow HTTP redirects (3xx responses)               │
│                                                                     │
│   ┌─ (visible when Follow Redirects is checked) ────────────────┐   │
│   │ ☐ Follow Original HTTP Method                               │   │
│   │   Keep the original method when redirected (instead of GET) │   │
│   │                                                              │   │
│   │ ☐ Follow Authorization Header                                │   │
│   │   Include Authorization header when redirected               │   │
│   │                                                              │   │
│   │ Max Redirects: [10_]                                         │   │
│   └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│ ☑ Enable SSL Certificate Verification                               │
│   Verify SSL certificates (disable for self-signed certs)           │
│                                                                     │
│ ☑ Automatically Decompress Response                                 │
│   Decompress gzip/deflate responses                                 │
└─────────────────────────────────────────────────────────────────────┘
```

**Supported Settings:**

| Setting | Default | Description |
|---------|---------|-------------|
| `timeout` | 30000ms | Request timeout (0 = no timeout) |
| `followRedirects` | true | Follow 301/302/303/307/308 redirects |
| `followOriginalMethod` | false | Keep original method on redirect |
| `followAuthHeader` | false | Include Authorization on redirect |
| `maxRedirects` | 10 | Maximum redirects to follow |
| `strictSSL` | true | Verify SSL certificates |
| `decompress` | true | Auto-decompress gzip/deflate |

### Response Section Tabs

#### Body Tab (Monaco Editor - Read-only)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Expand All] [Collapse All] [Copy]                                  │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ {                                                               │ │
│ │   "resultCode": "OK",                                           │ │
│ │   "resultObj": {                                                │ │
│ │     "token": "eyJhbG...",                                       │ │
│ │     "user": {                                                   │ │
│ │       "id": "12345",                                            │ │
│ │       "name": "John Doe"                                        │ │
│ │     }                                                           │ │
│ │   }                                                             │ │
│ │ }                                                               │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ (Monaco editor with JSON folding, read-only)                        │
└─────────────────────────────────────────────────────────────────────┘
```

#### Headers Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────┬─────────────────────────────────────┐   │
│ │ content-type            │ application/json; charset=utf-8     │   │
│ │ x-response-time         │ 145ms                               │   │
│ │ x-request-id            │ abc-123-def-456                     │   │
│ │ cache-control           │ no-cache                            │   │
│ │ date                    │ Sun, 15 Dec 2024 10:30:00 GMT       │   │
│ └─────────────────────────┴─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

#### Cookies Tab

```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌──────────────┬───────────────┬──────────┬─────────┬─────────────┐ │
│ │ Name         │ Value         │ Domain   │ Path    │ Expires     │ │
│ ├──────────────┼───────────────┼──────────┼─────────┼─────────────┤ │
│ │ sessionId    │ xyz789...     │ .telus   │ /       │ Session     │ │
│ │ avsToken     │ eyJhbG...     │ .telus   │ /       │ 1 hour      │ │
│ │ refreshToken │ abc123...     │ .telus   │ /       │ 7 days      │ │
│ └──────────────┴───────────────┴──────────┴─────────┴─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### History Sidebar

The sidebar is **resizable** (drag the edge to resize, min 180px, max 500px) and features **collapsible ticket groups**.

```
┌──────────────────────────┐
│ History (dev)            │  ← Filtered by selected env
├──────────────────────────┤
│ ▼ 🎫 AVS5-17837 (current)│  ← Collapsible group (click to toggle)
│   └─ id=12345  ✓ 200     │     Click ticket to open in Jira
│      2 min ago  1,234ms  │     Current branch highlighted
│      [Use] [×]           │  ← [Use] copies to request, [×] deletes
│                          │
│ ▶ 🎫 TSQA-41615         │  ← Collapsed group (▶ = collapsed)
│                          │
│ ▼ 📁 hotfix/r29_7_24     │  ← No ticket found, uses branch
│   └─ id=99999  ✗ 404     │     (no link, just text)
│      Dec 10    11,234ms  │     Duration with comma formatting
│      [Use] [×]           │
├──────────────────────────┤
│ ◄ ║                      │  ← Drag handle for resizing
└──────────────────────────┘
```

#### History Entry Features

| Feature | Description |
|---------|-------------|
| **Collapsible Groups** | Click chevron (▼/▶) to expand/collapse ticket groups |
| **Active State** | Currently selected entry highlighted with accent color |
| **Status Badge** | ✓ green (2xx), ⚠ orange (4xx), ✗ red (5xx) |
| **Duration** | Comma-formatted (e.g., `11,234ms`), color-coded by speed |
| **Duration Colors** | Green (<1s), Orange (1-5s), Red (>5s) |
| **Delete Button** | [×] button to remove individual history entries |
| **Resizable** | Drag right edge to resize (180px - 500px) |

#### Ticket Link Behavior

- Ticket numbers (e.g., `AVS5-17837`) are clickable links
- Click opens `{jiraBaseUrl}/{ticketNumber}` in default browser
- Example: `https://jira.telus.com/browse/AVS5-17837`
- Branch names without tickets are displayed as plain text (not clickable)

---

## Data Structures

### Request Data (from Flow Analyzer)

```typescript
interface AnalyzedEndpointData {
  method: string;           // "GET", "POST", etc.
  endpointUri: string;      // Full endpoint URI
  name: string;             // Version label
  description: string;      // Short URI
  
  // From flow analysis
  params: string[];         // ["contentId", "assetId"]
  query: string[];          // ["locale", "propertyName", "startDeltaTime"]
  headers: string[];        // ["x-client-id", "authorization"]
  body: string[];           // ["username", "password", "deviceId"]
}
```

### Request Payload

```typescript
interface TestRequest {
  environment: string;
  params: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: any | null;
}
```

### Response Data

```typescript
interface TestResponse {
  status: number;           // 200, 404, 500...
  statusText: string;       // "OK", "Not Found"...
  time: number;             // Response time in ms
  body: any;                // JSON response body
  headers: Record<string, string>;
  cookies: Cookie[];
}

interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
}
```

### History Entry

```typescript
interface HistoryEntry {
  id: string;               // UUID
  timestamp: number;        // Unix timestamp
  ticket: string | null;    // "AVS5-17837" or null
  branch: string;           // Full branch name
  environment: string;      // "dev", "sit", etc.
  params: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: any | null;
  settings?: RequestSettings;  // Request configuration
  response: {
    status: number;
    statusText: string;
    time: number;
  };
  transactionId?: string;   // x-avs-transactionid from response
  note?: string;            // Optional user note
}

interface RequestSettings {
  timeout?: number;                  // Request timeout in ms
  followRedirects?: boolean;         // Follow HTTP redirects
  followOriginalMethod?: boolean;    // Keep original method on redirect
  followAuthHeader?: boolean;        // Include auth header on redirect
  maxRedirects?: number;             // Maximum redirects to follow
  strictSSL?: boolean;               // Verify SSL certificates
  decompress?: boolean;              // Auto-decompress gzip/deflate
}
```

---

## Implementation Components

### Extension Side (TypeScript)

| Component | Purpose |
|-----------|---------|
| `EndpointTesterPanel` | Webview panel class |
| `EnvironmentConfigService` | Load/manage environments.json |
| `RequestHistoryService` | Load/save history files |
| `HttpRequestService` | Execute HTTP requests |
| `GitService` | Get current branch, extract ticket |

### Webview Side (JavaScript)

| Component | Purpose |
|-----------|---------|
| `endpoint-tester/index.html` | Main HTML structure |
| `endpoint-tester/script.js` | UI logic, Monaco editors |
| `endpoint-tester/style.css` | Feature-specific styles |
| `shared/monaco-viewer.js` | Shared Monaco utilities |
| `shared/monaco-viewer.css` | Shared Monaco styles |

---

## Technical Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          VS Code Extension Host                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────┐     ┌─────────────────────────────────────┐   │
│  │  EndpointTesterPanel │◄───►│           Webview (iframe)          │   │
│  │                     │     │  ┌─────────────────────────────────┐│   │
│  │  - createPanel()    │     │  │         index.html              ││   │
│  │  - handleMessage()  │     │  │  ┌───────────┐ ┌─────────────┐  ││   │
│  │  - sendRequest()    │     │  │  │ modules/* │ │  style.css  │  ││   │
│  │  - loadHistory()    │     │  │  └───────────┘ └─────────────┘  ││   │
│  └──────────┬──────────┘     │  │  ┌───────────────────────────┐  ││   │
│             │                │  │  │     Monaco Editors        │  ││   │
│             │                │  │  │  - Request Body           │  ││   │
│             │                │  │  │  - Response Body          │  ││   │
│             │                │  │  │  - Pre/Post Scripts       │  ││   │
│             ▼                │  │  └───────────────────────────┘  ││   │
│  ┌─────────────────────┐     │  └─────────────────────────────────┘│   │
│  │      Services       │     └─────────────────────────────────────┘   │
│  │                     │                                                │
│  │  ┌───────────────┐  │                                                │
│  │  │EnvironmentCfg │  │     Message Protocol (postMessage)            │
│  │  │   Service     │  │     ┌──────────────────────────────────────┐  │
│  │  └───────────────┘  │     │ Extension → Webview:                 │  │
│  │  ┌───────────────┐  │     │   - init (endpoint data, envs)       │  │
│  │  │ HttpRequest   │  │     │   - requestComplete (response)       │  │
│  │  │   Service     │  │     │   - requestError (error message)     │  │
│  │  └───────────────┘  │     │   - historyLoaded (history data)     │  │
│  │  ┌───────────────┐  │     │                                      │  │
│  │  │RequestHistory │  │     │ Webview → Extension:                 │  │
│  │  │   Service     │  │     │   - sendRequest (request payload)    │  │
│  │  └───────────────┘  │     │   - cancelRequest                    │  │
│  │  ┌───────────────┐  │     │   - loadHistoryEntry (entry id)      │  │
│  │  │  GitService   │  │     │   - deleteHistoryEntry (entry id)    │  │
│  │  └───────────────┘  │     │   - environmentChanged (env name)    │  │
│  └─────────────────────┘     └──────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Service Details

#### HttpRequestService

```typescript
// Location: src/services/http-request-service.ts

export interface RequestSettings {
  timeout?: number;              // Request timeout in ms
  followRedirects?: boolean;     // Follow 301/302/303/307/308
  followOriginalMethod?: boolean; // Keep method on redirect
  followAuthHeader?: boolean;    // Include auth on redirect
  maxRedirects?: number;         // Max redirect chain depth
  strictSSL?: boolean;           // Verify SSL certificates
  decompress?: boolean;          // Auto gzip/deflate
}

export class HttpRequestService {
  // Main entry point
  async execute(options: HttpRequestOptions): Promise<HttpResponse>;
  
  // Build URL from pattern and params
  buildUrl(env, endpointPath, params, query): string;
  
  // Internal: handles redirects recursively
  private async executeInternal(options, settings, redirectCount);
  
  // Parse Set-Cookie headers
  private parseCookies(setCookieHeaders): ParsedCookie[];
}
```

**Key Implementation Details:**
- Uses Node.js `http`/`https` modules (not `fetch` or `axios`)
- Manual redirect handling for fine-grained control
- Decompression via `zlib.gunzipSync` and `zlib.inflateSync`
- AbortController support for request cancellation
- SSL verification via `rejectUnauthorized` option

#### RequestHistoryService

```typescript
// Location: src/services/request-history-service.ts

export class RequestHistoryService {
  // Generate unique endpoint ID
  getEndpointId(method, endpointUri): string;
  
  // Add new history entry
  addEntry(middlewareName, endpointId, method, data): HistoryEntry;
  
  // Load history for endpoint
  loadHistory(middlewareName, endpointId): EndpointHistory;
  
  // Group by ticket/branch
  getEntriesGroupedByTicket(middlewareName, endpointId, env): GroupedHistory;
  
  // Save full response (optional)
  saveFullResponse(middlewareName, endpointId, entryId, response): void;
  // Save/load full response for shared history
  loadSharedFullResponse?(middlewareName, endpointId, entryId): FullResponse | null;
  
  // Load full response
  loadFullResponse(middlewareName, endpointId, entryId): FullResponse | null;
  
  // Delete single entry
  deleteEntry(middlewareName, endpointId, entryId): void;
}
```

**Storage Structure:**
```
history/
  └── {middlewareName}/
      └── {endpointId}/
          ├── history.json       # Request history entries
          └── responses/
              └── {entryId}.json # Full response data (optional)

shared-histories/
  └── {environment}/
    └── {collectionPath}/
      └── {requestId}/
        ├── transactions.json
        └── {entryId}.json # Full response data for shared entries (moved/copied on share)
```

#### EnvironmentConfigService

```typescript
// Location: src/services/environment-config-service.ts

export class EnvironmentConfigService {
  // Load and merge configurations
  loadConfig(): EnvironmentConfig;
  
  // Get resolved environment with merged headers
  getResolvedEnvironment(envName): ResolvedEnvironment;
  
  // Resolve {{variables}} in strings/objects
  resolveVariables(input, envName): string;
  resolveVariablesInObject(obj, envName): object;
  
  // Get/set selected environment
  getSelectedEnvironment(): string;
  setSelectedEnvironment(envName): void;
}
```

### Webview State Management

The webview JavaScript code follows SOLID principles with a modular architecture. See [Webview Module Architecture](#webview-module-architecture) for details.

```javascript
// Location: resources/features/endpoint-tester/modules/state.js

let state = {
  endpointInfo: null,           // Endpoint data from Flow Analyzer
  environments: [],             // Available environments
  selectedEnvironment: '',      // Current environment
  history: [],                  // Request history
  pathParams: {},               // Path parameter values
  queryParams: [],              // Query params [{key, value, enabled}]
  body: '',                     // Request body JSON
  authType: 'inherit',          // 'inherit', 'bearer', 'none'
  bearerToken: '',              // Manual bearer token
  saveResponse: false,          // Save full response flag
  
  settings: {                   // Request settings
    timeout: 30000,
    followRedirects: true,
    followOriginalMethod: false,
    followAuthHeader: false,
    maxRedirects: 10,
    strictSSL: true,
    decompress: true
  },
  
  scripts: {                    // Scripting feature state
    preRequest: '',             // Pre-request script content
    postResponse: ''            // Post-response script content
  },
  
  lastResponse: null,           // Last received response
  lastSentRequest: null,        // Last sent request (for scripts)
  resolvedEnvironment: null,    // Resolved environment config
  testResults: [],              // Script test results
  
  get headers() {               // Dynamic getter for headers
    return getHeaders();
  }
};
```

### Webview Module Architecture

The webview JavaScript follows **SOLID principles** with a modular architecture:

```
resources/features/endpoint-tester/
├── index.html          # Main HTML template
├── style.css           # Styles
└── modules/            # SOLID-compliant modules
    ├── state.js        # State management
    ├── elements.js     # DOM element references
    ├── utils.js        # Utility functions
    ├── url-builder.js  # URL construction
    ├── console-capture.js
    ├── test-results.js
    ├── expect-chain.js
    ├── agl-object.js
    ├── script-runner.js
    ├── history-renderer.js
    ├── request-builder.js
    ├── response-handler.js
    ├── form-manager.js
    └── main.js         # Orchestrator
```

#### Module Responsibilities

| Module | Single Responsibility |
|--------|----------------------|
| `state.js` | Application state management |
| `elements.js` | DOM element references and initialization |
| `utils.js` | Utility functions (escapeHtml, formatTime, formatDuration, etc.) |
| `url-builder.js` | URL construction from patterns and parameters |
| `console-capture.js` | Script console output capture and display |
| `test-results.js` | Test results display management |
| `expect-chain.js` | Chai-style assertion chain implementation |
| `agl-object.js` | AGL object factory (Postman pm-equivalent) |
| `script-runner.js` | Pre-request and post-response script execution |
| `history-renderer.js` | Request history UI rendering |
| `request-builder.js` | HTTP request object construction |
| `response-handler.js` | HTTP response display handling |
| `form-manager.js` | Form element management (params, headers, body) + inline metadata panels |
| `schema-editor-manager.js` | Body Schema & Response Schema tab editors (Monaco, toolbar, status-code sub-tabs) |
| `main.js` | Orchestrator - wires modules and handles events |

#### SOLID Principles Applied

1. **Single Responsibility (S)**: Each module has exactly one reason to change
2. **Open/Closed (O)**: Modules are extensible via dependency injection without modifying internals
3. **Liskov Substitution (L)**: Modules can be substituted with compatible implementations
4. **Interface Segregation (I)**: Each module exposes a focused interface with only necessary methods
5. **Dependency Inversion (D)**: High-level modules depend on factory functions, not concrete implementations

#### Module Bundling

Modules use ES module syntax and are bundled by **esbuild** at build time:

```javascript
// esbuild.js - builds webview bundle
const webviewCtx = await esbuild.context({
  entryPoints: ['resources/features/endpoint-tester/modules/main.js'],
  bundle: true,
  format: 'iife',  // Browser-compatible IIFE
  minify: production,
  platform: 'browser',
  outfile: 'resources/features/endpoint-tester/bundle.js',
});
```

**Benefits of bundling:**
- **1 HTTP request** instead of 14 separate script loads
- **Parallel download** with `defer` attribute
- **Tree-shaking** removes unused code in production
- **Minification** reduces bundle size

Modules use ES module imports:

```javascript
// Example: main.js imports
import { createState } from './state.js';
import { initElements } from './elements.js';
import { escapeHtml, formatTime } from './utils.js';
// ...
```

Each module exports via ES module syntax:

```javascript
// Example: state.js
function createState(getHeadersFn) {
    return { /* state object */ };
}

export { createState };
```

### Message Protocol

#### Extension → Webview Messages

| Command | Payload | Description |
|---------|---------|-------------|
| `init` | `{endpoint, environments, selected, history}` | Initialize panel |
| `requestComplete` | `{response, history}` | Request finished |
| `requestError` | `{error}` | Request failed |
| `historyLoaded` | `{entry, fullResponse}` | History entry loaded (for shared entries `fullResponse` will be read from the shared-history storage if present) |
| `historyDeleted` | `{history}` | Entry deleted, updated list |
| `bodySchemaLoaded` | `{schema}` | Body schema loaded from storage |
| `responseSchemaLoaded` | `{schema}` | Response schema loaded from storage |
| `bodySchemaInferred` | `{schema}` | Body schema inferred from body content |
| `responseSchemaInferred` | `{schema}` | Response schema inferred from history/capture |
| `bodyValidationResult` | `{valid, errors}` | Body validation result against schema |
| `bodySchemaSaved` | - | Body schema saved successfully |
| `responseSchemaSaved` | - | Response schema saved successfully |
| `exampleBodyGenerated` | `{example}` | Example body generated from schema |
| `graphqlSchemaReceived` | `{schema, endpointUrl, typeCount, hasQuery, hasMutation, hasSubscription}` | GraphQL schema fetched via introspection |
| `graphqlSchemaError` | `{error}` | GraphQL introspection failed |
| `graphqlCompletions` | `{items, context}` | GraphQL completion items for cursor position |
| `graphqlSchemaCacheCleared` | - | GraphQL schema cache cleared |

#### Webview → Extension Messages

| Command | Payload | Description |
|---------|---------|-------------|
| `sendRequest` | `{params, query, headers, body, settings}` | Execute request |
| `cancelRequest` | - | Cancel in-progress request |
| `loadHistoryEntry` | `{id}` | Load entry into builder |
| `deleteHistoryEntry` | `{id}` | Delete history entry |
| `environmentChanged` | `{environment}` | User switched env |
| `openEnvironmentEditor` | - | Open env editor panel |
| `getBodySchema` | `{collectionId, requestId}` | Load body schema from storage |
| `getResponseSchema` | `{collectionId, requestId}` | Load response schema from storage |
| `saveBodySchema` | `{collectionId, requestId, schema}` | Save body schema |
| `saveResponseSchema` | `{collectionId, requestId, schema}` | Save response schema |
| `inferBodySchema` | `{collectionId, requestId, body, sentBody}` | Infer body schema from content |
| `inferResponseSchema` | `{collectionId, requestId}` | Infer response schema from history |
| `validateBody` | `{collectionId, requestId, body, sentBody}` | Validate body against schema |
| `captureResponse` | `{collectionId, requestId, response}` | Capture last response for schema |
| `generateExampleBody` | `{collectionId, requestId, bodySchema}` | Generate example body from schema. `bodySchema` is the current editor content (priority); falls back to collection/context lookup when absent. |
| `generateExampleResponse` | `{collectionId, requestId, responseSchema, statusCode}` | Generate example response from schema. `responseSchema` is the current editor content with `components`; `statusCode` is the active sub-tab. Falls back to collection/context lookup. |
| `graphqlFetchSchema` | `{endpointUrl, headers}` | Trigger GraphQL introspection query (headers include Auth tab authorization — bearer, basic, apikey, oauth2) |
| `graphqlGetCompletions` | `{endpointUrl, document, offset}` | Get GraphQL completions for cursor position |
| `graphqlClearSchemaCache` | `{endpointUrl}` | Clear cached GraphQL schema |

---

## Data Flow

This section describes how request data (endpointUri, method, middlewareName, query, headers, body, etc.) flows through the different components of the Endpoint Tester.

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              LAUNCH FLOW                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────┐   Data Flow Analysis   ┌─────────────────────────────────┐   │
│  │Flow Analyzer │ ─────────────────────▶ │ EndpointInfoInput               │   │
│  │              │   - req.params         │ {                               │   │
│  │ Analyzes     │   - req.query          │   method: "GET"                 │   │
│  │ middleware   │   - req.headers        │   endpointUri: "/:id/detail"    │   │
│  │ source code  │   - req.body           │   middlewareName: "content"     │   │
│  └──────────────┘                        │   query: ["locale", "format"]   │   │
│                                          │   headers: ["x-auth-token"]     │   │
│                                          │   bodyFields: ["data", "meta"]  │   │
│                                          │ }                               │   │
│                                          └───────────────┬─────────────────┘   │
│                                                          │                     │
│                                                          ▼                     │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                     EndpointTesterPanel.show()                           │  │
│  │  1. mapToEndpointTestData() - Converts input to strict EndpointTestData  │  │
│  │  2. createPanel() - Creates webview panel                                │  │
│  │  3. sendInitialData() - Sends 'init' message to webview                  │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           INITIALIZATION FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Extension Host                              Webview (script.js)                │
│  ─────────────────                          ─────────────────────               │
│                                                                                 │
│  sendInitialData() ─────────────────────────▶ window.addEventListener          │
│  {                                              ('message', handler)            │
│    command: 'init',                                    │                        │
│    data: {                                             ▼                        │
│      endpoint: EndpointTestData ─────────────▶ state.endpointInfo = data       │
│      environments: ['local','dev','sit']               │                        │
│      selectedEnvironment: 'dev'                        │                        │
│      resolvedEnvironment: {...}                        │                        │
│      history: [{entries...}]                           │                        │
│      jiraBaseUrl: 'https://jira...'                    │                        │
│    }                                                   │                        │
│  }                                                     ▼                        │
│                                              ┌──────────────────┐               │
│                                              │ UI Population    │               │
│                                              │ - renderParams() │               │
│                                              │ - renderQuery()  │               │
│                                              │ - renderHeaders()│               │
│                                              │ - applyBodyData()│               │
│                                              │ - renderHistory()│               │
│                                              └──────────────────┘               │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           REQUEST EXECUTION FLOW                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  STEP 1: User Clicks "Send" Button                                              │
│  ─────────────────────────────────────────────────────────────────              │
│                                                                                 │
│  Webview (script.js)                                                            │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  sendRequest() {                                                          │  │
│  │    // Collect path params from DOM                                        │  │
│  │    const pathParams = {};                                                 │  │
│  │    elements.pathParams.querySelectorAll('.param-row').forEach(row => {    │  │
│  │      pathParams[row.dataset.key] = row.querySelector('.value').value;     │  │
│  │    });                                                                    │  │
│  │                                                                           │  │
│  │    // Collect query params (only enabled ones)                            │  │
│  │    const query = state.queryParams.reduce((acc, {key, value, enabled}) => │  │
│  │      enabled ? {...acc, [key]: value} : acc, {});                         │  │
│  │                                                                           │  │
│  │    // Headers via getter (reads from DOM)                                 │  │
│  │    const headers = state.headers;                                         │  │
│  │                                                                           │  │
│  │    // Body from Monaco editor                                             │  │
│  │    const body = state.body || requestBodyEditor.getValue();               │  │
│  │                                                                           │  │
│  │    // Settings from state                                                 │  │
│  │    const settings = { ...state.settings };                                │  │
│  │  }                                                                        │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                          │                                      │
│                                          ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  vscode.postMessage({                                                     │  │
│  │    command: 'sendRequest',                                                │  │
│  │    request: {                                                             │  │
│  │      params: { id: "12345" },                                             │  │
│  │      query: { locale: "en_CA", format: "json" },                          │  │
│  │      headers: { "x-auth-token": "{{authToken}}", "Accept": "app/json" },  │  │
│  │      body: { data: {...}, meta: {...} },                                  │  │
│  │      authType: "inherit",                                                 │  │
│  │      bearerToken: "",                                                     │  │
│  │      saveResponse: false,                                                 │  │
│  │      settings: {                                                          │  │
│  │        timeout: 30000,                                                    │  │
│  │        followRedirects: true,                                             │  │
│  │        strictSSL: true,                                                   │  │
│  │        decompress: true,                                                  │  │
│  │        ...                                                                │  │
│  │      }                                                                    │  │
│  │    }                                                                      │  │
│  │  });                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  STEP 2: Extension Host Receives Message                                        │
│  ─────────────────────────────────────────────────────────────────              │
│                                                                                 │
│  EndpointTesterPanel                                                            │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  handleSendRequest(request) {                                             │  │
│  │    // Get current environment                                             │  │
│  │    const environment = envConfigService.getSelectedEnvironment();         │  │
│  │    const resolvedEnv = envConfigService.getResolvedEnvironment(env);      │  │
│  │    // resolvedEnv = { baseUrl, headers, variables, ... }                  │  │
│  │  }                                                                        │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                          │                                      │
│                                          ▼                                      │
│  STEP 3: Variable Resolution                                                    │
│  ─────────────────────────────────────────────────────────────────              │
│                                                                                 │
│  EnvironmentConfigService                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  // Resolve {{variables}} in all request data                             │  │
│  │                                                                           │  │
│  │  // Input:  { id: "{{contentId}}" }                                       │  │
│  │  // Output: { id: "12345" }                                               │  │
│  │  resolvedParams = resolveVariablesInObject(request.params, env);          │  │
│  │                                                                           │  │
│  │  // Input:  { locale: "{{locale}}" }                                      │  │
│  │  // Output: { locale: "en_CA" }                                           │  │
│  │  resolvedQuery = resolveVariablesInObject(request.query, env);            │  │
│  │                                                                           │  │
│  │  // Merge environment headers with request headers (case-insensitive)     │  │
│  │  // Env headers: { "x-api-key": "abc123" }                                │  │
│  │  // Request headers: { "x-auth-token": "{{authToken}}" }                  │  │
│  │  // Merged: { "x-api-key": "abc123", "x-auth-token": "token123" }         │  │
│  │  mergedHeaders = mergeHeadersCaseInsensitive(env.headers, req.headers);   │  │
│  │  resolvedHeaders = resolveVariablesInObject(mergedHeaders, env);          │  │
│  │                                                                           │  │
│  │  // Resolve body variables                                                │  │
│  │  resolvedBody = resolveVariablesInObject(request.body, env);              │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                          │                                      │
│                                          ▼                                      │
│  STEP 4: URL Construction                                                       │
│  ─────────────────────────────────────────────────────────────────              │
│                                                                                 │
│  HttpRequestService                                                             │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  buildUrl(resolvedEnv, endpointUri, resolvedParams, resolvedQuery) {      │  │
│  │                                                                           │  │
│  │    // endpointUri pattern: "/:id/detail"                                  │  │
│  │    // resolvedParams: { id: "12345" }                                     │  │
│  │    //                                                                     │  │
│  │    // Step 4a: Build path from pattern                                    │  │
│  │    buildPathFromPattern("/:id/detail", { id: "12345" })                   │  │
│  │      → path = "/12345/detail"                                             │  │
│  │                                                                           │  │
│  │    // Step 4b: Build query string                                         │  │
│  │    URLSearchParams({ locale: "en_CA", format: "json" })                   │  │
│  │      → queryString = "locale=en_CA&format=json"                           │  │
│  │                                                                           │  │
│  │    // Step 4c: Combine with baseUrl                                       │  │
│  │    baseUrl = "https://dev-agl.telus.com"                                  │  │
│  │    → fullUrl = "https://dev-agl.telus.com/12345/detail?locale=en_CA..."   │  │
│  │  }                                                                        │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                          │                                      │
│                                          ▼                                      │
│  STEP 5: HTTP Request Execution                                                 │
│  ─────────────────────────────────────────────────────────────────              │
│                                                                                 │
│  HttpRequestService.execute()                                                   │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  execute({                                                                │  │
│  │    method: "GET",                                                         │  │
│  │    url: "https://dev-agl.telus.com/12345/detail?locale=en_CA...",         │  │
│  │    headers: { "x-api-key": "abc123", "x-auth-token": "token123" },        │  │
│  │    body: null,  // or JSON for POST/PUT                                   │  │
│  │    signal: AbortController.signal,                                        │  │
│  │    settings: { timeout: 30000, followRedirects: true, ... }               │  │
│  │  })                                                                       │  │
│  │                                                                           │  │
│  │  // Uses Node.js http/https modules                                       │  │
│  │  // Handles redirects (301/302/303/307/308)                               │  │
│  │  // Handles SSL verification                                              │  │
│  │  // Handles gzip/deflate decompression                                    │  │
│  │  // Tracks timing                                                         │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           RESPONSE FLOW                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  STEP 6: Response Handling & History                                            │
│  ─────────────────────────────────────────────────────────────────              │
│                                                                                 │
│  EndpointTesterPanel                                                            │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  // After httpService.execute() returns:                                  │  │
│  │  response = {                                                             │  │
│  │    statusCode: 200,                                                       │  │
│  │    statusMessage: "OK",                                                   │  │
│  │    headers: { "content-type": "application/json", ... },                  │  │
│  │    body: { ... },                                                         │  │
│  │    cookies: [...],                                                        │  │
│  │    timing: 234  // ms                                                     │  │
│  │  }                                                                        │  │
│  │                                                                           │  │
│  │  // Save to history                                                       │  │
│  │  historyEntry = historyService.addEntry(middlewareName, endpointId, {     │  │
│  │    environment: "dev",                                                    │  │
│  │    branch: "feature/AVS5-17837-add-new-endpoint",                         │  │
│  │    params: resolvedParams,                                                │  │
│  │    query: resolvedQuery,                                                  │  │
│  │    headers: resolvedHeaders,                                              │  │
│  │    body: resolvedBody,                                                    │  │
│  │    settings: request.settings,                                            │  │
│  │    response: { status: 200, statusText: "OK", time: 234 },                │  │
│  │    transactionId: "abc-123-def"                                           │  │
│  │  });                                                                      │  │
│  │                                                                           │  │
│  │  // Optional: Save full response body                                     │  │
│  │  if (saveResponse) {                                                      │  │
│  │    historyService.saveFullResponse(middleware, endpointId, entryId, resp);│  │
│  │  }                                                                        │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                          │                                      │
│                                          ▼                                      │
│  STEP 7: Send Response to Webview                                               │
│  ─────────────────────────────────────────────────────────────────              │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  panel.webview.postMessage({                                              │  │
│  │    command: 'requestComplete',                                            │  │
│  │    response: {                                                            │  │
│  │      statusCode: 200,                                                     │  │
│  │      statusMessage: "OK",                                                 │  │
│  │      headers: { ... },                                                    │  │
│  │      body: { ... },                                                       │  │
│  │      cookies: [...],                                                      │  │
│  │      timing: 234                                                          │  │
│  │    },                                                                     │  │
│  │    history: updatedHistoryGroups,                                         │  │
│  │    newEntryId: "entry-uuid-123"                                           │  │
│  │  });                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                          │                                      │
│                                          ▼                                      │
│  STEP 8: Webview UI Update                                                      │
│  ─────────────────────────────────────────────────────────────────              │
│                                                                                 │
│  Webview (script.js)                                                            │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  handleResponse(response) {                                               │  │
│  │    // Display status badge with color coding                              │  │
│  │    elements.responseStatus.textContent = "200 OK";                        │  │
│  │    elements.responseStatus.className = "badge success";                   │  │
│  │                                                                           │  │
│  │    // Display timing with color coding                                    │  │
│  │    elements.responseTime.textContent = "234ms";                           │  │
│  │    elements.responseTime.className = "badge time fast";                   │  │
│  │                                                                           │  │
│  │    // Display response body in Monaco editor                              │  │
│  │    responseBodyEditor.setValue(JSON.stringify(response.body, null, 2));   │  │
│  │                                                                           │  │
│  │    // Display response headers                                            │  │
│  │    renderResponseHeaders(response.headers);                               │  │
│  │                                                                           │  │
│  │    // Display cookies                                                     │  │
│  │    renderCookies(response.cookies);                                       │  │
│  │  }                                                                        │  │
│  │                                                                           │  │
│  │  // Update history sidebar                                                │  │
│  │  renderHistory(history, newEntryId);                                      │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Data Transformation Summary

| Stage | Input | Processing | Output |
|-------|-------|------------|--------|
| **Flow Analyzer** | Middleware source code | AST analysis of `req.params`, `req.query`, `req.headers`, `req.body` | `EndpointInfoInput` with field names |
| **Panel Initialization** | `EndpointInfoInput` | `mapToEndpointTestData()` with defaults | `EndpointTestData` (strict types) |
| **UI Population** | `EndpointTestData` | Generate input fields for each param/header/body field | DOM elements with empty values |
| **User Input** | DOM elements | User fills in values, may use `{{variables}}` | `state.pathParams`, `state.queryParams`, etc. |
| **Request Collection** | DOM + state | `sendRequest()` collects all values | Request object with raw values |
| **Variable Resolution** | Raw values with `{{var}}` | `resolveVariablesInObject()` using environment | Resolved values |
| **Header Merging** | Env headers + Request headers | `mergeHeadersCaseInsensitive()` | Combined headers (request overrides env) |
| **URL Construction** | Pattern + Params + Query | `buildUrl()` with `buildPathFromPattern()` | Full URL with path params and query string |
| **HTTP Execution** | URL + Headers + Body | Node.js `http`/`https` request | Response object |
| **History Storage** | Request + Response | `addEntry()` with branch/ticket info | Persisted `HistoryEntry` |
| **UI Display** | Response object | Monaco editor + tables | Formatted response display |

### Key Data Structures

#### EndpointTestData (Extension → Webview)

```typescript
interface EndpointTestData {
  method: string;           // "GET", "POST", "PUT", "DELETE", etc.
  endpointUri: string;      // Express.js pattern: "/:id/detail"
  middlewareName: string;   // "content", "recording", etc.
  query: string[];          // Field names: ["locale", "format"]
  headers: string[];        // Header names: ["x-auth-token"]
  body: string[];           // Body field names: ["data", "meta"]
}
```

#### Request Payload (Webview → Extension)

```typescript
interface RequestPayload {
  params: Record<string, string>;    // { "id": "12345" }
  query: Record<string, string>;     // { "locale": "en_CA" }
  headers: Record<string, string>;   // { "x-auth-token": "{{token}}" }
  body: object | null;               // Parsed JSON body
  authType: 'inherit' | 'bearer' | 'none';
  bearerToken: string;
  saveResponse: boolean;
  settings: RequestSettings;
}
```

#### Response Payload (Extension → Webview)

```typescript
interface ResponsePayload {
  statusCode: number;               // 200
  statusMessage: string;            // "OK"
  headers: Record<string, string>;  // Response headers
  body: any;                        // Parsed JSON or raw text
  cookies: ParsedCookie[];          // Parsed Set-Cookie headers
  timing: number;                   // Duration in ms
}
```

### Path Parameter Processing

Express.js-style route patterns are parsed and values substituted:

```
Pattern:    /:tenant/:appversion(T2.2|T7.[0-9])/:cluster/content/:id
                ↓           ↓                      ↓          ↓
Params:    { tenant: "optik", appversion: "T2.2", cluster: "c1", id: "12345" }
                ↓           ↓                      ↓          ↓
Result:    /optik/T2.2/c1/content/12345
```

**Pattern Types:**
- `:param` - Required parameter
- `:param?` - Optional parameter (omitted if empty)
- `:param(regex)` - Parameter with regex constraint (constraint ignored, value used)
- `:param(regex)?` - Optional parameter with regex constraint

### Query Parameter Processing

```javascript
// User input (with enabled/disabled toggle)
state.queryParams = [
  { key: 'locale', value: 'en_CA', enabled: true },
  { key: 'format', value: 'json', enabled: true },
  { key: 'debug', value: 'true', enabled: false }  // Disabled
];

// Collected in sendRequest() - only enabled params
query = { locale: 'en_CA', format: 'json' };

// After variable resolution
resolvedQuery = { locale: 'en_CA', format: 'json' };

// Built into URL
url = "https://dev-agl.telus.com/12345/detail?locale=en_CA&format=json"
```

### Header Merging Process

Headers from multiple sources are merged case-insensitively:

```javascript
// Environment headers (from environments.json)
envHeaders = {
  'X-API-Key': 'env-api-key-123',
  'Content-Type': 'application/json'
};

// Request headers (user input in webview)
requestHeaders = {
  'x-api-key': 'override-key-456',     // Overrides env (case-insensitive)
  'X-Auth-Token': '{{authToken}}'      // New header
};

// Merged result (request headers take precedence)
mergedHeaders = {
  'x-api-key': 'override-key-456',     // User override preserved
  'Content-Type': 'application/json',  // From environment
  'X-Auth-Token': 'resolved-token'     // After variable resolution
};
```

### Variable Resolution

Variables use double-brace syntax `{{variableName}}` and are resolved at request time:

```javascript
// environments.json
{
  "environments": {
    "dev": {
      "variables": {
        "authToken": "dev-token-abc123",
        "contentId": "12345",
        "locale": "en_CA"
      }
    }
  },
  "globalVariables": {
    "apiVersion": "1.2"
  }
}

// Input with variables
input = {
  params: { id: '{{contentId}}' },
  query: { locale: '{{locale}}', version: '{{apiVersion}}' },
  headers: { 'Authorization': 'Bearer {{authToken}}' }
};

// After resolution
resolved = {
  params: { id: '12345' },
  query: { locale: 'en_CA', version: '1.2' },
  headers: { 'Authorization': 'Bearer dev-token-abc123' }
};
```

**Resolution Order:**
1. Environment-specific variables (highest priority)
2. Global variables
3. Unresolved variables remain as `{{variableName}}`

---

## Feature Summary

| Feature | Description |
|---------|-------------|
| **Global Environment Selector** | Dropdown in header, persists across sessions |
| **Pre-filled Inputs** | Auto-populated from Flow Analyzer data |
| **Variable Support** | `{{variable}}` syntax with autocomplete |
| **Request Builder** | Params, Auth, Headers, Body, Settings tabs |
| **Request Settings** | Timeout, redirects, SSL, decompression options |
| **Monaco Editors** | Request body (editable), Response body (read-only) |
| **Response Display** | Body, Headers, Cookies tabs |
| **History Sidebar** | Filtered by environment, grouped by ticket |
| **Collapsible History** | Expand/collapse ticket groups with chevron |
| **Resizable Sidebar** | Drag to resize (180px - 500px) |
| **Active Entry Highlight** | Selected history entry highlighted |
| **Duration Formatting** | Comma-separated (e.g., `11,234ms`), color-coded |
| **Ticket Extraction** | Auto-detect from git branch name |
| **Copy from History** | [Use] button copies to request builder |
| **Delete History** | [×] button to remove individual entries |
| **Jira Integration** | Link to ticket from history |
| **Prod Warning** | Confirmation required for production |
| **Request Cancellation** | Cancel button during request |
| **Save Full Response** | Option to save complete response with transaction ID |

---

## Future Enhancements

- [ ] Export request as cURL command
- [ ] Import/export request collections
- [ ] Request chaining (use response in next request)
- [ ] Dynamic variables (`{{$timestamp}}`, `{{$uuid}}`)
- [ ] Environment quick-switch keyboard shortcut
- [ ] Response diff (compare two responses)
- [ ] Mock response mode (for offline testing)
- [ ] HTTP/2 support (requires separate http2 module)

---

## Implemented Features (Recent)

The following features have been implemented:

### Request Settings Tab
- **Timeout**: Configurable request timeout (0 = no timeout)
- **Follow Redirects**: Automatic 301/302/303/307/308 handling
- **Follow Original Method**: Keep HTTP method on redirect
- **Follow Auth Header**: Include Authorization on redirect
- **Max Redirects**: Limit redirect chain depth
- **SSL Verification**: Enable/disable certificate verification
- **Auto-Decompress**: Automatic gzip/deflate decompression

### History Improvements
- **Collapsible Groups**: Expand/collapse ticket groups with chevron toggle
- **Resizable Sidebar**: Drag handle to resize (180px - 500px)
- **Active State**: Highlight currently selected history entry
- **Duration Formatting**: Comma-separated display (e.g., `11,234ms`)
- **Duration Color Coding**: Green (<1s), Orange (1-5s), Red (>5s)
- **Delete Entries**: Remove individual history entries with [×] button

### Response Handling
- **Clear Response**: Automatic clearing when switching history entries
- **Full Response Storage**: Save complete response with transaction ID
- **Status Badges**: Color-coded status indicators

---

## Environment Editor

A dedicated panel for managing environment configurations using Monaco editor.

### Launch

- Click gear icon ⚙️ next to the environment dropdown
- Or command palette: "AGL: Edit Environments"

### UI Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ AGL Environment Editor                                    [Save]    │
├─────────────────────────────────────────────────────────────────────┤
│ [Shared Config] [Local Config]                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Shared Config Tab (environments.json):                             │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ {                                                               ││
│  │   "jiraBaseUrl": "https://jira.telus.com/browse",               ││
│  │   "environments": {                                             ││
│  │     "dev": {                                                    ││
│  │       "baseUrl": "https://dev-agl.telus.com",                   ││
│  │       "variables": {                                            ││
│  │         "propertyName": "optiktv"                               ││
│  │       }                                                         ││
│  │     },                                                          ││
│  │     ...                                                         ││
│  │   }                                                             ││
│  │ }                                                               ││
│  └─────────────────────────────────────────────────────────────────┘│
│  (Monaco editor - editable, JSON validation)                        │
│                                                                     │
│  Local Config Tab (environments.local.json):                        │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ {                                                               ││
│  │   "credentials": {                                              ││
│  │     "dev": {                                                    ││
│  │       "headers": {                                              ││
│  │         "Authorization": "Bearer {{devToken}}"                  ││
│  │       }                                                         ││
│  │     }                                                           ││
│  │   },                                                            ││
│  │   "variables": {                                                ││
│  │     "devToken": "eyJhbG...",                                    ││
│  │     "myTestUser": "john.doe"                                    ││
│  │   }                                                             ││
│  │ }                                                               ││
│  └─────────────────────────────────────────────────────────────────┘│
│  (Monaco editor - editable, JSON validation)                        │
│  ⚠️ This file is gitignored - keep your secrets safe!               │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Status: ✓ Valid JSON                              [Reset] [Save]    │
└─────────────────────────────────────────────────────────────────────┘
```

### Features

| Feature | Description |
|---------|-------------|
| **Tabbed Editor** | Switch between shared and local config |
| **Monaco Editor** | JSON syntax highlighting, validation, folding |
| **JSON Validation** | Real-time validation with error markers |
| **Auto-format** | Format JSON on save |
| **Schema Validation** | Validate against expected structure |
| **Dirty Indicator** | Show unsaved changes with `●` on tab |
| **Reset Button** | Discard changes, reload from file |
| **Save Button** | Write changes to file |
| **File Status** | Show if file exists, create if missing |

### Monaco Editor Options

```javascript
MonacoViewer.createEditor(container, {
  value: configJson,
  language: 'json',
  readOnly: false,           // Editable
  fontSize: 13,
  formatOnPaste: true,
  formatOnType: true
});
```

### Validation

```typescript
interface EnvironmentConfig {
  jiraBaseUrl?: string;
  environments: {
    [key: string]: {
      baseUrl: string;
      description?: string;
      requiresConfirmation?: boolean;
      variables?: Record<string, string>;
    }
  };
  globalVariables?: Record<string, string>;
  defaultHeaders?: Record<string, string>;
}

interface LocalConfig {
  credentials?: {
    [env: string]: {
      headers?: Record<string, string>;
    }
  };
  variables?: Record<string, string>;
}
```

### Error Handling

- **Invalid JSON**: Red underline, error in status bar
- **Missing required fields**: Warning markers
- **File not found**: Offer to create with template
- **Permission denied**: Show error message

### Integration with Endpoint Tester

- Changes saved in Environment Editor are immediately available
- No restart required
- Environment dropdown refreshes after save
