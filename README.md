# HTTP Forge 🔨

**Design, Test & Document REST APIs — All Inside VS Code.** Combines the power of Postman + Thunder Client + Swagger UI in a single, free, offline-first extension. Thunder Client-compatible filter pipes and inline JS expressions, full OpenAPI 3.0 round-trip, schema inference from real responses, collection-driven test suites, and advanced scripting — no account, no cloud, no compromises.


## 📸 Screenshots

*Click any screenshot to open the full-size image.*

| Feature | Screenshot |
|---------|------------|
| Send a Request | <a href="https://raw.githubusercontent.com/hsl1230/http-forge-assets/main/resources/send-a-request.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge-assets/main/resources/send-a-request.png" width="360" alt="Send a Request" title="Open full-size image"></a> |
| Run a Collection | <a href="https://raw.githubusercontent.com/hsl1230/http-forge-assets/main/resources/run-a-collection.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge-assets/main/resources/run-a-collection.png" width="360" alt="Run a Collection" title="Open full-size image"></a> |
| Add Request from Other Collections | <a href="https://raw.githubusercontent.com/hsl1230/http-forge-assets/main/resources/add-request-from-other-collections.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge-assets/main/resources/add-request-from-other-collections.png" width="360" alt="Add Request from Other Collections" title="Open full-size image"></a> |
| Check Result Item | <a href="https://raw.githubusercontent.com/hsl1230/http-forge-assets/main/resources/check-result-item.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge-assets/main/resources/check-result-item.png" width="360" alt="Check Result Item" title="Open full-size image"></a> |
| Edit Environment | <a href="https://raw.githubusercontent.com/hsl1230/http-forge-assets/main/resources/edit-environment.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge-assets/main/resources/edit-environment.png" width="360" alt="Edit Environment" title="Open full-size image"></a> |
| Import Postman Collection | <a href="https://raw.githubusercontent.com/hsl1230/http-forge-assets/main/resources/import-postman-collection.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge-assets/main/resources/import-postman-collection.png" width="360" alt="Import Postman Collection" title="Open full-size image"></a> |
| Import Postman Environment | <a href="https://raw.githubusercontent.com/hsl1230/http-forge-assets/main/resources/import-post-man-environment.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge-assets/main/resources/import-post-man-environment.png" width="360" alt="Import Postman Environment" title="Open full-size image"></a> |
| Response Time Statistics | <a href="https://raw.githubusercontent.com/hsl1230/http-forge-assets/main/resources/ressonse-time-statistics.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge-assets/main/resources/ressonse-time-statistics.png" width="360" alt="Response Time Statistics" title="Open full-size image"></a> |

---

## 🆚 Why HTTP Forge over Postman Extension?

| Feature | HTTP Forge | Postman Extension |
|---------|------------|-------------------|
| **Price** | ✅ Free forever | ❌ Requires Postman account (paid tiers) |
| **Account Required** | ✅ No | ❌ Yes (mandatory sign-in) |
| **Offline Use** | ✅ Full functionality | ❌ Requires internet connection |
| **Collection Storage** | ✅ Local filesystem | ❌ Cloud-only (Postman servers) |
| &emsp;↳ Version Control | ✅ Git-managed, track changes | ❌ No Git support |
| &emsp;↳ File Structure | ✅ Folder-based, separate files per request | ❌ Proprietary cloud format |
| &emsp;↳ Team Collaboration | ✅ No merge conflicts | ❌ Sync conflicts possible |
| &emsp;↳ Privacy | ✅ Data stays on your machine | ❌ Data synced to Postman cloud |
| **Import Postman Collections** | ✅ Full v2.1 support | N/A |
| **HTTP Methods** | ✅ GET, POST, PUT, PATCH, DELETE, etc. | ✅ Full HTTP method support |
| **Query Parameters** | ✅ With enable/disable toggles | ✅ With enable/disable toggles |
| **Custom Headers** | ✅ With enable/disable toggles | ✅ With enable/disable toggles |
| **Request Body** | ✅ JSON, form-data, raw text | ✅ JSON, form-data, raw text |
| **URL Patterns** | ✅ Express.js style with path parameter constraints | ❌ Basic URL only |
| **Pre/Post Scripts** | ✅ Sandboxed with configurable module access | ❌ Sandboxed, no custom modules |
| **Built-in Libraries** | ✅ lodash, moment, uuid, CryptoJS, etc. | ✅ lodash, moment, uuid, CryptoJS, etc. |
| **Test Assertions** | ✅ Chai-style expect, JSON schema | ✅ Chai-style expect, JSON schema |
| **Environment Variables** | ✅ Local files | ❌ Cloud-synced only |
| **Variable Scopes** | ✅ Global, Environment, Collection, Session | ✅ Global, Environment, Collection |
| **Template Engine** | ✅ Filters, JS expressions, string concat | ❌ Variable lookup + script-only filters |
| **IntelliSense / Autocomplete** | ✅ Variables, filters, dynamic vars, script API | ❌ No template IntelliSense |
| **Script Template Pre-Resolution** | ✅ `{{var}}` auto-resolves in script source | ❌ Requires `replaceIn()` |
| **Cookie Management** | ✅ Auto-persist, domain-aware | ✅ Auto-persist, domain-aware |
| **Request History** | ✅ Grouped by Git ticket/branch | ❌ Flat list only |
| &emsp;↳ Context Tracking | ✅ Shows actual sent request (resolved variables) | ❌ Shows template only |
| &emsp;↳ Replay | ✅ Re-execute any history item | ✅ Re-execute any history item |
| &emsp;↳ Shared Histories | ✅ Custom groups, Git-trackable for team | ❌ Cloud-synced only |
| **Response Viewer** | ✅ Syntax highlighting, headers, cookies | ✅ Syntax highlighting, headers, cookies |
| **Collection Runner** | ✅ Cross-collection, P50/P90/P95/P99 stats | ❌ Single collection only |
| **Keyboard Shortcuts** | ✅ Ctrl+Enter to send, etc. | ✅ Standard shortcuts |
| **Extension Size** | ✅ Lightweight | ❌ Larger footprint |
| **Works in Restricted Networks** | ✅ Yes | ❌ No (needs Postman servers) |
| **Extension API** | ✅ Open API for third-party integrations | ❌ Closed ecosystem |
| **Code Generation** | ✅ TypeScript clients from collections | ❌ Not available |
| **Playwright Integration** | ✅ Built-in fixtures & runtime | ❌ Not available |
| **Authentication** | ✅ OAuth 2.0, Bearer, Basic, API Key | ✅ OAuth 2.0, Basic, API Key, AWS Sig |
| **OpenAPI 3.0** | ✅ Full import/export with schema inference | ✅ Import only |
| **GraphQL** | ✅ Introspection, auto-complete, schema explorer | ✅ Schema introspection, auto-complete |
| **WebSocket** | 🔜 Planned | ✅ Full WebSocket support |
| **Mock Servers** | 🔜 Planned (local) | ✅ Cloud-based mocks |
| **Visualizer** | 🔜 Planned | ✅ Custom HTML/charts from responses |

### 🎯 Perfect for developers who:
- Want **full offline capability** - no internet required
- Need **Git version control** for API collections
- Work in **teams** - folder-based storage avoids merge conflicts
- Work in **restricted/air-gapped networks**
- Prefer **local-first** tools without cloud sync
- Want **privacy** - keep API data on your machine
- Already use **Postman** and want to migrate easily

> **Migrating from Postman?** Just export your Postman collection (v2.1 format) and import it into HTTP Forge!

---

## 🔀 Why HTTP Forge over Thunder Client?

| Feature | HTTP Forge | Thunder Client |
|---------|------------|----------------|
| **Price** | ✅ Free forever, fully open | ⚠️ Free tier limited; paid for advanced |
| **Filter Pipes** | ✅ 25+ filters, Thunder Client compatible | ✅ Built-in filters |
| **JS Expressions in `{{ }}`** | ✅ `{{price * quantity}}`, ternary, concat | ❌ JS only in script tabs |
| **String Concatenation** | ✅ `{{firstName + ' ' + lastName}}` | ❌ Not in templates |
| **Dynamic Variables** | ✅ 18 vars with parameterized args | ✅ System variables |
| **Env Vars in Dynamic Args** | ✅ `{{$randomInt(minVal, maxVal)}}` | ❌ Literal args only |
| **Nested Property Paths** | ✅ `prop("a.b.c")`, `map("x.y")` | ❌ Single-level only |
| **Variable Refs in Filter Args** | ✅ `{{price \| add(tax)}}` | ❌ Literal args only |
| **IntelliSense / Autocomplete** | ✅ Variables, filters, dynamic vars, script API | ❌ No template IntelliSense |
| **Script Template Pre-Resolution** | ✅ `{{var}}` auto-resolves in script source | ❌ Requires `replaceIn()` |
| **Collection Storage** | ✅ Git-friendly files | ⚠️ SQLite DB (paid: Git sync) |
| **Pre/Post Scripts** | ✅ Sandboxed with custom modules | ✅ Sandboxed scripts |
| **Test Assertions** | ✅ Chai-style expect | ✅ Built-in assertions |
| **OAuth 2.0** | ✅ All 4 grant types + PKCE | ✅ OAuth 2.0 support |
| **OpenAPI 3.0** | ✅ Full import/export + schema inference | ❌ Not available |
| **Schema Editor** | ✅ Body + Response schema tabs | ❌ Not available |
| **Collection Runner** | ✅ Cross-collection, P50/P90/P95/P99 | ✅ Collection runner |
| **Code Generation** | ✅ TypeScript clients | ❌ Not available |
| **Playwright Integration** | ✅ Built-in fixtures | ❌ Not available |
| **Extension API** | ✅ Open API for integrations | ❌ Closed |
| **GraphQL** | ✅ Introspection, auto-complete, schema explorer | ✅ GraphQL support |
| **WebSocket** | 🔜 Planned | ✅ WebSocket support |

---

## ✨ Features

### 🔧 Request Builder
- **All HTTP Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
- **Query Parameters**: Add, edit, and toggle parameters with ease
- **Headers**: Custom headers with enable/disable toggles
- **Request Body**: JSON, form-data, raw text, or no body
  - **Mustache template highlighting**: Editors highlight full Mustache expressions (variables, sections, partials, comments, and unescaped/triple stache) while preserving Monaco's native syntax highlighting.
- **Path Variables**: `{{variableName}}` syntax with automatic substitution
- **GraphQL**: Full-featured GraphQL body type with schema introspection, context-aware auto-complete, syntax highlighting, Schema Explorer panel, and operation selector
- **Authentication**: OAuth 2.0 (all 4 grant types with PKCE), Bearer, Basic, API Key
- **Pre-request Scripts**: Run JavaScript before each request — `{{variable}}` templates auto-resolve in script source
- **Post-response Scripts**: Process responses with custom scripts — templates, filters, and expressions work inline

### � Template Engine
- **Filter Pipes**: Chain filters on any variable — `{{variable | upper | substring(0, 5)}}`
- **25+ Built-in Filters**: String (`upper`, `lower`, `trim`, `replace`, `split`, `join`, `format`), Math (`add`, `subtract`, `multiply`, `abs`), Encoding (`btoa`, `atob`, `urlEncode`, `urlDecode`), Hash (`hash`, `hmac`), Array (`first`, `last`, `at`, `slice`, `unique`, `filter`, `map`), Object (`prop`, `parseJSON`, `stringify`), Validation (`isEmail`, `isUrl`)
- **JavaScript Expressions**: `{{price * quantity}}`, `{{status === 'active' ? 'yes' : 'no'}}`, `` {{`Hello ${name}`}} ``
- **String Concatenation**: `{{firstName + ' ' + lastName}}`
- **Nested Property Paths**: `{{response | prop("data.user.name")}}`, `{{users | map("address.city")}}`
- **No-Input Filters**: `{{@ | btoa}}` — generate values without an input variable
- **Variable References in Filter Args**: `{{price | add(tax)}}` — `tax` is resolved from environment
- **Sandboxed Execution**: JS expressions run in a Node.js `vm` sandbox with 100ms timeout- **IntelliSense / Autocomplete**: Context-aware code completion in all Monaco editors — type `{{` for variables, `$` for dynamic variables, `|` for filters, and `hf.`/`pm.`/`ctx.` for the full scripting API with deep chain support
### �📋 Schema Management
- **Body Schema**: JSON Schema editor for request bodies with "Infer from Body", "Generate Example", and "Validate Body" actions. Generate Example reads the current editor content so user edits are always reflected.
- **Response Schema**: Per-status-code response schema editor with "Infer from History", "Capture Last Response", and "Generate Example" actions. Generate Example uses the active status-code sub-tab.
- **Inline Metadata**: Expandable metadata panels on params, headers, and query rows for type, description, required, format, enum, and deprecated annotations
- **Schema Inference**: Automatic schema generation from execution history, live body content, and post-response script analysis
- **External Schema Integration**: Third-party extensions (e.g. Spring API Tester) can push `bodySchema` and `responseSchema` via `openRequestContext` — schemas are merged with saved data and available in the schema tabs immediately

### 📁 Collections Management
- **Organize Requests**: Group requests into collections and folders
- **Import/Export**: Postman-compatible collection format (v2.1)
- **OpenAPI 3.0**: Import OpenAPI specs to create collections; export collections as OpenAPI 3.0.3 YAML/JSON
- **Drag & Drop**: Rearrange requests easily
- **Collection Runner**: Execute entire collections with configurable iterations

### 🌍 Environment Management
- **Multiple Environments**: Dev, staging, production, and custom environments
- **Variable Substitution**: Use `{{variableName}}` anywhere in your requests
- **Environment Inheritance**: Share common variables across environments
- **Local Secrets**: Store sensitive data in gitignored files
- **Session Variables**: Temporary variables that persist during your session

### 📊 Response Viewer
- **Syntax Highlighting**: Beautiful JSON, XML, and HTML formatting
- **Response Headers**: View all response headers in a table
- **Cookies**: Inspect and manage cookies
- **Metrics**: Response time, status code, and response size
- **Color-coded Status**: Green (2xx), Orange (4xx), Red (5xx)

### 📜 Request History
- **Auto-save**: Every request is automatically saved
- **Grouped by Context**: Organize history by ticket/branch
- **Re-execute**: Click to restore and re-run past requests
- **Delete Entries**: Remove individual history items
- **Duration Tracking**: Color-coded response times

### 🔐 Authentication
- **OAuth 2.0**: Full support for all four grant types:
  - **Authorization Code + PKCE**: Browser-based auth via VS Code URI handler with S256 challenge
  - **Client Credentials**: Server-to-server token acquisition
  - **Password**: Resource owner credentials grant
  - **Implicit**: Browser-based token for SPAs
- **Token Management**: Automatic caching, expiry detection, refresh token support, SecretStorage persistence
- **Bearer Token**: Simple token-based authentication
- **Basic Auth**: Username/password credentials
- **API Key**: Send in header or query parameter
- **Inherit**: Cascade auth from collection/folder level
- **Advanced Options**: Auth0 audience, Azure AD resource, custom token prefix, client auth mode (body/header)

### 🍪 Cookie Management
- **Automatic Handling**: Cookies persist across requests
- **Domain-aware**: Cookies scoped to appropriate domains
- **View & Edit**: Inspect cookies in the response panel

### 🧪 Test Suite
- **Cross-Collection**: Select requests from multiple collections
- **Save & Reuse**: Save test configurations for QA teams
- **Batch Execution**: Run selected requests with iterations
- **Performance Statistics**: P50/P90/P95/P99 response times
- **Error Analysis**: Error rate and error type breakdown

## 🚀 Quick Start

1. **Install**: Search for "HTTP Forge" in VS Code Extensions
2. **Open**: Click the 🔨 icon in the Activity Bar
3. **Create**: Click "+" to create a new collection
4. **Add Request**: Right-click collection → "New Request"
5. **Configure**: Set method, URL, headers, and body
6. **Send**: Press `Ctrl+Enter` or click "Send"

## 📚 User Guides

Start here: [docs/user-guide/index.md](docs/user-guide/index.md)

## 📖 Usage Guide

### Creating Your First Request

1. In the **Collections** view, click the **+** button
2. Name your collection (e.g., "My API")
3. Right-click the collection → **New Request**
4. Enter the request name and URL
5. Select HTTP method (GET, POST, etc.)
6. Add headers or body as needed
7. Click **Send** to execute

### Working with Environments

Environments let you define variables for different contexts (dev, prod, etc.):

```json
{
  "dev": {
    "baseUrl": "http://localhost:3000",
    "apiKey": "dev-key-123"
  },
  "prod": {
    "baseUrl": "https://api.example.com",
    "apiKey": "{{API_KEY}}"
  }
}
```

Use variables in your requests:
- URL: `{{baseUrl}}/api/users`
- Header: `Authorization: Bearer {{apiKey}}`
- Body: `{"token": "{{sessionToken}}"}`

### Template Engine — Filters & Expressions

HTTP Forge supports Thunder Client-compatible filter pipes and JavaScript expressions inside `{{ }}`:

**Filters** — chain with `|`:
```
{{username | upper}}                          → "ALICE"
{{email | lower | trim}}                      → "alice@example.com"
{{password | btoa}}                            → base64 encoded
{{price | add(tax)}}                           → adds env variable 'tax'
{{users | filter(age>25) | map("name")}}       → ["Alice", "Charlie"]
{{response | prop("data.user.name")}}           → nested property access
{{@ | format("{0} {1}", lastName)}}             → string formatting
```

**JavaScript expressions**:
```
{{price * quantity}}                           → math
{{status === 'active' ? 'yes' : 'no'}}         → ternary
{{firstName + ' ' + lastName}}                 → concatenation
{{`Hello ${name}`}}                            → template literals
```

**Dynamic variables with environment args**:
```
{{$randomInt(minValue, maxValue)}}             → resolves minValue/maxValue from env
{{$guid}}                                      → random UUID
{{$timestamp}}                                 → Unix timestamp
```

### Pre-request & Post-response Scripts

**Pre-request Script** (runs before the request):
```javascript
// Set a timestamp
forge.setVariable('timestamp', Date.now());

// Generate random ID
forge.setVariable('requestId', forge.uuid());
```

**Post-response Script** (runs after receiving response):
```javascript
// Extract token from response
const token = forge.response.json().token;
forge.setVariable('authToken', token);

// Validate response
if (forge.response.status !== 200) {
    forge.log('Request failed!');
}
```

### Running Test Suites

**Quick Run (single collection):**
1. Right-click a collection → **Run All**
2. Configure iterations and delay
3. Click **Run** or **Save & Run**

**Create Test Suite (cross-collection):**
1. In **Test Suites** view, click **+**
2. Select requests from multiple collections
3. Arrange execution order
4. Save for reuse by QA team

**Performance Statistics:**
- View P50/P90/P95/P99 response times
- Error rate and error breakdown
- Per-request and overall statistics

## ⚙️ Configuration

HTTP Forge uses a `http-forge.config.json` file in your workspace root for configuration. This allows you to version control your settings and share them across your team.

### Quick Start

Create a `http-forge.config.json` file in your workspace root:

```json
{
  "$schema": "./node_modules/http-forge/docs/http-forge.config.schema.json",
  "version": "1.0",
  "storage": {
    "format": "folder",
    "root": "./http-forge"
  }
}
```

### Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| `version` | `"1.0"` | Configuration file version |
| `storage.format` | `"folder"` | Storage format: `"folder"` or `"json"` |
| `storage.root` | `"./http-forge"` | Root directory for collections, environments, flows, suites |
| `storage.history` | `"./.http-forge-cache/histories"` | Request history directory |
| `storage.results` | `"./.http-forge-cache/results"` | Test results directory |
| `request.timeout` | `30000` | Default request timeout (ms) |
| `request.followRedirects` | `true` | Follow HTTP redirects |
| `request.maxRedirects` | `10` | Maximum redirects to follow |
| `request.strictSSL` | `true` | Verify SSL certificates |
| `scripts.modulePaths` | `["./src", "./lib"]` | Paths for custom script modules |
| `runner.resultsRetentionDays` | `7` | Days to retain test results |
| `runner.indexPageSize` | `1000` | Entries per result index page |
| `runner.recentErrorsLimit` | `20` | Max recent errors to track |
| `environments.default` | `"dev"` | Default environment name |
| `proxy` | `null` | Proxy configuration |

### Storage Formats

#### Folder Format (Recommended)
Each request is stored as a folder with separate files:
- `meta.json` - Request metadata and headers
- `body.json` / `body.xml` / `body.txt` - Request body

Benefits:
- Git-friendly diffs
- Easy to edit manually
- Better for large request bodies

#### JSON Format (Legacy)
Collections stored as single JSON files. Simpler but harder to diff.

## 🔌 Extension API

HTTP Forge exposes a public API for other VS Code extensions:

```typescript
import * as vscode from 'vscode';

// Get HTTP Forge API
const httpForge = vscode.extensions.getExtension('henry-huang.http-forge');
if (httpForge?.isActive) {
    const api = httpForge.exports;
    
    // Execute a request
    const response = await api.executeRequest({
        method: 'GET',
        url: 'https://api.example.com/data',
        headers: { 'Authorization': 'Bearer token' }
    });
    
    // Get environment variables
    const env = api.getResolvedEnvironment('production');
    console.log(env.variables.baseUrl);
    
    // Open request in tester
    api.openRequest('collection-id', ['folder'], {
        name: 'My Request',
        method: 'POST',
        url: '{{baseUrl}}/api/data',
        // Optional: provide schemas for Body Schema / Response Schema tabs
        bodySchema: { contentType: 'application/json', schema: { type: 'object', properties: { name: { type: 'string' } } } },
        responseSchema: { responses: { '200': { schema: { type: 'object' }, description: 'OK' } } }
    });
}
```

### API Reference

| Method | Description |
|--------|-------------|
| `getEnvironmentNames()` | Get all environment names |
| `getSelectedEnvironment()` | Get current environment name |
| `setSelectedEnvironment(name)` | Switch active environment |
| `getResolvedEnvironment(name)` | Get merged environment config |
| `executeRequest(options)` | Execute an HTTP request |
| `openRequest(collectionId, path, request)` | Open request in tester panel |
| `openEnvironmentEditor(name?)` | Open environment editor |
| `getCollections()` | Get all collections |
| `getRequestHistory(collectionId, requestId)` | Get request history |

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Send Request | `Ctrl+Enter` (in request panel) |
| New Request | `Ctrl+N` (in Collections view) |
| Save Request | `Ctrl+S` (in request panel) |

## 📋 Requirements

- Visual Studio Code 1.99.3 or higher
- Node.js 18+ (for extension development)

## 🐛 Known Issues

- Large response bodies (>10MB) may cause performance issues
- Cookie persistence requires workspace trust

Report issues at [GitHub Issues](https://github.com/hsl1230/http-forge/issues)

## 📝 Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

### 1.1.0 (2025-01-XX)
- Webview SOLID refactoring - modular architecture with 22 separate modules
- Improved code maintainability and testability

### 1.0.0 (2024-12-31)
- Initial release
- Full-featured HTTP client
- Collections and environments
- Request history
- Collection runner
- Extension API for integration

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

**Enjoy HTTP Forge!** 🔨✨
- Request builder with full HTTP method support
- Collections and folders
- Environment management
- Request history
- Cookie management
- Test Suite with performance statistics
- Postman import/export

## Contributing

Contributions are welcome! Please see our [contributing guidelines](CONTRIBUTING.md).

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Enjoy building and testing APIs with HTTP Forge! 🔨**
