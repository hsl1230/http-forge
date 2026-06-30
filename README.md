# HTTP Forge 🔨

**The AI-driven API testing platform built for VS Code.** Design, test, and automate APIs with GitHub Copilot natively or any MCP-compatible AI (Claude, Cursor, Continue, and more) — no extra API keys, no cloud account required. HTTP Forge combines full Postman compatibility, OpenAPI 3.0 round-trip, headless CLI execution, TypeScript client codegen, cloud secret providers, a 60-tool MCP server for AI agents, and agentic workflows that write tests, fix assertions, and validate your API against its spec — all offline, all local, all free.

## 🚀 Install

- Install from the VS Code Marketplace: `henry-huang.http-forge`

## 🧪 Standalone Launcher (QA / Testing)

Run HTTP Forge as an isolated standalone tool — no other extensions, clean profile:

| Platform | Download |
|----------|----------|
| Linux / macOS | [http-forge.sh](scripts/http-forge.sh) |
| Windows | [http-forge.bat](scripts/http-forge.bat) |

```bash
# Linux / macOS
./http-forge.sh

# Windows
http-forge.bat
```

The launcher auto-detects (or downloads) VS Code and installs HTTP Forge in an isolated profile. Use `--dev` for your full dev environment, or `--both` to run dev + test side by side. See [Launcher Guide](docs/user-guide/cli-standalone.md#launcher-standalone-gui) for details.

## 🖥️ CLI (Headless / CI)

HTTP Forge also supports CLI-based execution for CI/CD and scripted workflows.

- Run single requests, collections, and suites without opening VS Code
- Manage MCP server lifecycle from terminal (`mcp-server start`, `stop`, `status`)
- Use JSON output for machine-readable pipeline integration

See [CLI & Standalone Guide](docs/user-guide/cli-standalone.md) for commands and examples.

## 📸 Screenshots

*Click any screenshot to open the full-size image.*

| Feature | Screenshot |
|---------|------------|
| Send a Request | <a href="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/send-a-request.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/send-a-request.png" width="360" alt="Send a Request" title="Open full-size image"></a> |
| Run a Collection | <a href="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/run-a-collection.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/run-a-collection.png" width="360" alt="Run a Collection" title="Open full-size image"></a> |
| Add Request from Other Collections | <a href="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/add-request-from-other-collections.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/add-request-from-other-collections.png" width="360" alt="Add Request from Other Collections" title="Open full-size image"></a> |
| Check Result Item | <a href="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/check-result-item.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/check-result-item.png" width="360" alt="Check Result Item" title="Open full-size image"></a> |
| Edit Environment | <a href="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/edit-environment.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/edit-environment.png" width="360" alt="Edit Environment" title="Open full-size image"></a> |
| Import Postman Collection | <a href="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/import-postman-collection.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/import-postman-collection.png" width="360" alt="Import Postman Collection" title="Open full-size image"></a> |
| Import Postman Environment | <a href="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/import-post-man-environment.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/import-post-man-environment.png" width="360" alt="Import Postman Environment" title="Open full-size image"></a> |
| Response Time Statistics | <a href="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/ressonse-time-statistics.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/ressonse-time-statistics.png" width="360" alt="Response Time Statistics" title="Open full-size image"></a> |
| OAuth 2.0 | <a href="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/oauth2.0.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/oauth2.0.png" width="360" alt="OAuth 2.0" title="Open full-size image"></a> |
| OpenAPI Type | <a href="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/open-api-type.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/open-api-type.png" width="360" alt="OpenAPI Type" title="Open full-size image"></a> |
| OpenAPI Type 2 | <a href="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/open-api-type-2.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/open-api-type-2.png" width="360" alt="OpenAPI Type 2" title="Open full-size image"></a> |
| Template Code Completion | <a href="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/template-code-completion.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/template-code-completion.png" width="360" alt="Template Code Completion" title="Open full-size image"></a> |
| Template Code Completion 2 | <a href="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/template-code-completion-2.png" target="_blank" rel="noopener noreferrer"><img src="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/template-code-completion-2.png" width="360" alt="Template Code Completion 2" title="Open full-size image"></a> |

---
## 🤖 AI-Driven Testing Platform

HTTP Forge is the only VS Code API client with **deep GitHub Copilot integration** and a **full MCP server** — turning AI agents into autonomous API testers that run inside your editor.

| Capability | HTTP Forge | Postman | Thunder Client | Bruno | Insomnia |
|---|---|---|---|---|---|
| **GitHub Copilot native** (no extra API key) | ✅ | ❌ Postbot needs account | ❌ | ❌ | ❌ |
| **MCP server for AI agents** | ✅ 60+ tools | ❌ | ❌ | ❌ | ❌ |
| **AI coverage analysis vs OpenAPI spec** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **AI assertion healing from live run results** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **AI scenario generation** (400/401/403/boundary) | ✅ | ❌ | ❌ | ❌ | ❌ |
| **AI collection enhancement** (bodies + tests) | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Agentic env-var detection & replacement** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Fully local / offline / free** | ✅ | ❌ | ⚠️ | ✅ | ⚠️ |

**What the AI can do for you:**
- ✨ **Generate** request bodies and test scripts from natural language
- 🔍 **Scan** collections for hardcoded values and replace them with `{{ENV_VAR}}` placeholders
- 📊 **Analyse coverage** — compare your requests against an OpenAPI spec and surface untested paths
- 🩹 **Heal assertions** — given a failed run, rewrite broken `pm.test()` checks automatically
- 📝 **Generate scenarios** — produce negative/edge-case variants (400/401/403/404/boundary) for any request
- 📅 **Schedule CI** — generate a GitHub Actions workflow for any test suite (`http-forge schedule --suite smoke`)
- 🤖 **Agent mode** — Claude or Copilot in agent mode can drive the entire test lifecycle via MCP, no manual steps

> In-editor AI features use your **existing GitHub Copilot subscription**. The MCP server works with **any AI that supports MCP** — Claude, Cursor, Continue, and more. No API keys, no separate accounts, no data leaves your machine.

---

## 🔄 Migrate from Postman — Zero Rewriting Required

Already have Postman collections? **Import and run them unchanged.** HTTP Forge is the only VS Code extension with deep `pm.*` scripting parity — your existing scripts, assertions, and environments work on day one.

**What transfers over automatically:**

| What you have in Postman | Works in HTTP Forge |
|---|---|
| Collections v2.1 (requests, folders, auth) | ✅ Full import |
| Environments & globals | ✅ Full import |
| `pm.test()` / `pm.expect()` / Chai assertions | ✅ Unchanged |
| `pm.environment` / `pm.globals` / `pm.collectionVariables` | ✅ Unchanged |
| `pm.response.json()`, `.text()`, `.headers`, `.cookies` | ✅ Unchanged |
| `pm.sendRequest()`, `pm.setNextRequest()`, `pm.execution.skipRequest()` | ✅ Unchanged |
| `pm.visualizer.set()` (Handlebars templates) | ✅ Unchanged |
| `pm.iterationData` (data-driven runs) | ✅ Unchanged |
| Legacy globals: `responseBody`, `tests["check"] = bool`, `tv4.validate()` | ✅ Unchanged |
| Legacy `postman.setEnvironmentVariable()` / `postman.setGlobalVariable()` | ✅ Unchanged |
| All body modes: raw, urlencoded, form-data, GraphQL, binary | ✅ Unchanged |
| CryptoJS (AES, HMAC, SHA256, Base64…) | ✅ Unchanged |
| lodash, moment, uuid (built-in, no install needed) | ✅ Unchanged |

**How to migrate in 3 steps:**

```
1. In Postman: Collections → ⋯ → Export → Collection v2.1 JSON
2. In HTTP Forge: Command Palette → "HTTP Forge: Import Collection" → select the file
3. Optional: choose "✨ Yes, enhance with AI" to add example bodies and test scripts
```

> Your existing Postman scripts run without modification. HTTP Forge adds on top: async script draining, typed variables, filter pipes, cloud secrets, OS keychain, and 60+ MCP tools for AI agents — without breaking anything you already have.

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
| **Variable Scopes** | ✅ Global, Environment, Collection | ✅ Global, Environment, Collection |
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
| **MCP Server** | ✅ Expose collections to AI agents (Claude, Copilot) | ❌ Not available |
| **AI Features (Copilot)** | ✅ Generate bodies, scripts, env vars, coverage, healing | ❌ Postbot (cloud, paid) |
| **Agentic MCP tools** | ✅ 60+ tools — full test lifecycle | ❌ Not available |
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
| **MCP Server** | ✅ Expose collections to AI agents (Claude, Copilot) | ❌ Not available |
| **AI Features (Copilot)** | ✅ Generate bodies, scripts, env vars, coverage, healing | ❌ Not available |
| **Agentic MCP tools** | ✅ 60+ tools — full test lifecycle | ❌ Not available |
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
- **Path Variables**: `{{variableName}}` syntax with automatic substitution; enum-driven select dropdowns for constrained values (2+ enum items in `PathParamEntry`)
- **GraphQL**: Full-featured GraphQL body type with schema introspection, context-aware auto-complete, syntax highlighting, Schema Explorer panel, and operation selector
- **Authentication**: OAuth 2.0 (all 4 grant types with PKCE), Bearer, Basic, API Key
- **Pre-request Scripts**: Run JavaScript before each request — `{{variable}}` templates auto-resolve in script source
- **Post-response Scripts**: Process responses with custom scripts — templates, filters, and expressions work inline
- **Request Documentation**: View request-level Markdown docs from `doc.md` files in the Document tab

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
- **Duplicate**: Right-click to duplicate collections, folders, or requests — copies all nested content including scripts and schemas
- **Collection Runner**: Execute entire collections with configurable iterations
- **File Watching**: Collection file changes auto-refresh the tree view and all open panels
- **Request Documentation**: Each request folder supports a `doc.md` file for inline API docs

### 🌍 Environment Management
- **Multiple Environments**: Dev, staging, production, and custom environments
- **Variable Substitution**: Use `{{variableName}}` anywhere in your requests
- **Environment Inheritance**: Share common variables across environments
- **Local Secrets**: Store sensitive data in gitignored files
- **OS Keychain Secrets**: Promote environment variables to the OS keychain (Windows Credential Manager, macOS Keychain, Linux Secret Service) via VS Code SecretStorage — click the 🔒 lock icon on any variable row
- **Cloud Secret Providers**: Reference secrets from AWS Secrets Manager, Azure Key Vault, Google Secret Manager, HashiCorp Vault, 1Password, and Doppler with `{{secret:alias/path}}` — credentials never stored in HTTP Forge ([guide](docs/user-guide/secret-providers.md))
- **Environment Overrides**: `pm.environment.set()` persists to workspace state (like Postman)
- **Type-safe Variables**: Store arrays, objects, numbers, and booleans — `get()` returns the exact type you stored
- **File Watching**: Environment file changes auto-refresh the tree view and all open panels

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
- **Suite & Request Descriptions**: Document what the suite tests and what each request does in the flow — inline editing with multi-line hover tooltips
- **Request Actions Menu**: Per-request `⋯` menu with Edit (suite copy), Open Original (collection source), Reset to Collection, and Remove
- **Save & Reuse**: Save test configurations for QA teams
- **Batch Execution**: Run selected requests with iterations
- **Performance Statistics**: P50/P90/P95/P99 response times
- **Error Analysis**: Error rate and error type breakdown
- **HTML Reports**: Self-contained HTML report generated after every run — summary cards, P90/P99 stats table, request timeline, and expandable failure details

### 🤖 MCP Server — AI Agent Integration
- **AI-Accessible Tools**: Expose all your collections and test suites as MCP tools so AI agents (Claude, GitHub Copilot, and others) can discover and execute them directly
- **Single Request Execution**: AI can run any saved request with full override support — environment, variables, headers, query params, and body — without modifying your collection
- **Collection Runner**: AI can run an entire collection sequentially and report results
- **Test Suite Runner**: AI can trigger test suites with iteration count, request filters, stop-on-error, and delay options
- **Variable Chaining**: Post-response scripts set variables normally; `modifiedVariables` returned so AI can pass tokens from one call to the next
- **HTML Test Reports**: MCP responses include `report.uri` so AI can open/share the full HTML report directly
- **Project-level Control** (`http-forge.config.json`): `excludedCollections`, `excludedSuites`, `toolPrefix`, `maxRequestsPerCall`, `cors.allowedOrigins`
- **Toggle from Status Bar**: `⊙ MCP ○` / `⊙ MCP ● 3100` click-to-toggle; or use Command Palette

### 🧠 AI Features — Powered by GitHub Copilot

Uses your active **GitHub Copilot** subscription — no extra API keys, no external LLM config required.

- **Generate Collection from curl** — Command Palette → `HTTP Forge: Generate Collection from curl (AI)`: paste a curl command, get a fully-formed collection.
- **Enhance Collection with AI** — fills realistic example request bodies and `pm.test()` assertion scripts for every request. Available during Import Collection and Import OpenAPI Spec flows.
- **Suggest Env Variables** — scans every header, query param, URL, and body for hardcoded values (tokens, base URLs, tenant IDs) and proposes `{{ENV_VAR}}` replacements. Available from the Collection Editor Overview tab, tree right-click, or Command Palette.
- **Request Tester AI toolbar** — per-request: ✨ **Scan** (hardcoded value detection), ✨ **Generate body** (describe payload → Copilot writes JSON), ✨ **Generate with AI** (describe script → Copilot writes it), ✨ **Enhance with AI** (rewrite auto-suggested `pm.test()` snippets into smarter assertions).
- **Response AI toolbar** — after every response: **Explain**, **Contract Tests**, **Extract Vars**, **TS Types**, **Compare** (diff vs previous), **💬 Chat** (multi-turn AI chat scoped to the current request/response).
- **💬 AI Assistant chat** — persistent, multi-turn chat panel. Every message includes the request endpoint, last response status, Content-Type, and body (first 800 chars) as context — ask *"Why did this return a 401?"* without copy-pasting anything.
- **Agentic MCP tools** — when the MCP server is running, AI agents can drive the full test lifecycle: `ai_suggest_env_vars`, `ai_enhance_collection`, `analyze_coverage`, `validate_against_spec`, `generate_scenarios`, `heal_assertions`, `generate_iteration_data`, and more. See [MCP Server guide](docs/user-guide/mcp-server.md).

## 🚀 Quick Start

1. **Install**: Search for "HTTP Forge" in VS Code Extensions
2. **Open**: Click the 🔨 icon in the Activity Bar
3. **Create**: Click "+" to create a new collection
4. **Add Request**: Right-click collection → "New Request"
5. **Configure**: Set method, URL, headers, and body
6. **Send**: Press `Ctrl+Enter` or click "Send"

## 📚 User Guides

Start here: [docs/user-guide/index.md](docs/user-guide/index.md)

- [Extension (VS Code) — full UI reference + AI features](docs/user-guide/extension.md)
- [CLI & Standalone — headless runs, CI, schedule](docs/user-guide/cli-standalone.md)
- [MCP Server — AI agent integration](docs/user-guide/mcp-server.md)
- [Secret Providers — AWS, Azure, GCP, Vault, 1Password, Doppler](docs/user-guide/secret-providers.md)
- [Codegen — TypeScript client generation](docs/user-guide/codegen.md)
- [Playwright Integration](docs/user-guide/playwright.md)
- [Configuration reference](docs/user-guide/configuration.md)

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

See [CHANGELOG.md](CHANGELOG.md) for the full release history.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

**Enjoy HTTP Forge!** 🔨✨
