# HTTP Forge Extension (VS Code) Guide

This guide is written for VS Code extension users. It covers the full workflow: configuration, collections, request tester, environments, scripts, history, and suites.

## 1) Install and open
1. Install the HTTP Forge extension from VS Code Marketplace.
2. Open your workspace folder.
3. Create `.http-forge/http-forge.config.json` in the workspace root.

See: configuration.md

## 2) Configure storage (required)
HTTP Forge uses `storage.root` as the main workspace for collections, environments, flows, and suites. History and results are saved separately.

Recommended:
- Keep `storage.history` and `storage.results` in a gitignored cache folder.
- Keep `storage.root` inside your repo so collections and environments are versioned.

See: configuration.md

## 3) Collections and requests
### Create a collection
1. Open the HTTP Forge sidebar.
2. Click **+** → **New Collection**.
3. Name the collection.

### Create folders
Use folders to group related requests.

### Create a request
1. Right‑click a collection or folder → **New Request**.
2. Set the method and URL/path.
3. Configure params, headers, body, auth, scripts, and settings.
4. Click **Save**.

Example URL:
```
{{baseUrl}}/users/:id
```

### Duplicate a collection, folder, or request
Right-click any item in the Collections tree and select **Duplicate**. Enter a name for the copy.

- **Collection**: Copies the entire collection including all folders, requests, scripts, schemas, and documentation files.
- **Folder**: Copies the folder and all nested requests within the same collection.
- **Request**: Copies the request into the same folder.

### Naming tips
- Use stable request names for codegen and Playwright.
- Avoid duplicate names in the same folder.

See: collections-requests.md

## 4) Request Tester
The Request Tester is the primary execution UI.

### Request line
- Method selector
- URL/path input
- Send and Save buttons
- Resolved URL preview below the request line shows the final URL after environment variables, dynamic variables, filters, and auth query params are resolved.

### Params tab
- Path params are auto‑detected from `:param` and `{{param}}` patterns.
- Query params are editable rows with enable/disable toggles.

### Authorization tab
- Inherit
- OAuth 2.0 (Authorization Code + PKCE, Client Credentials, Password, Implicit)
- Bearer token
- Basic auth
- API Key (header or query)

### Headers tab
- Add and toggle headers on/off without removing them.

### Body tab
- JSON
- form-data
- GraphQL (tabbed Query + Variables editors with schema introspection, auto-complete, and Schema Explorer)
- raw text
- none

The Response viewer (Body tab) also supports an HTML Preview for rendered responses — use the Raw/Preview toggle to switch between source and rendered views.

### Scripts tab
- Pre‑request and Post‑response script editors
- Template snippets available

### Settings tab
- Timeout
- Redirect handling
- SSL verification
- TLS configuration (CA/client cert/PFX)
- Decompression

### Document tab
- Rendered Markdown view of the request's `doc.md` file
- "Open File" button to edit in VS Code
- Live reload on save

Open panels auto-reload when collection or environment files change on disk.

See: request-tester.md

## 5) Environment selection and variables
HTTP Forge resolves variables using `{{variableName}}` syntax. Variables can be defined at multiple scopes:
- Global (workspace)
- Environment (persisted to workspace state)
- Collection

Use the environment dropdown to switch contexts. The resolved environment also controls default headers and credentials.

Example variable use:
```
Authorization: Bearer {{authToken}}
```

See: environments-variables.md

## 6) Scripts and assertions
Scripts run in two phases:
- Pre‑request: modify request, set variables
- Post‑response: validate response, assert expectations

You can use any alias: `ctx`, `pm`, or `agl`.

Common APIs:
- `ctx.request`, `ctx.response`
- `ctx.variables`, `ctx.environment`, `ctx.collectionVariables`, `ctx.globals`
- `ctx.test()`, `ctx.expect()`
- `ctx.sendRequest()` for chained calls

See: scripts-assertions.md

### Custom modules
Scripts can `require()` modules installed in your workspace and built‑in libraries.

See: custom-modules.md

## 7) Response viewer
After sending a request you can inspect:
- Status, time, size
- Response body (formatted)
- Headers and cookies
- Tests results
- Console output (script logs)

## 8) History and shared history
- Every request execution is saved to history.
- History is grouped by ticket/branch and collapsible.
- Click an entry to restore its request state.
- Share entries into `storage.root/shared-histories` with a tag.
- Rename shared groups from the header.

See: history-shared.md

## 9) Test suites
Suites let you run flow-based scenarios across collections using node graphs (`request`, `script`, `if`, `switch`, `for`, `while`, `block`).

Key features:
- Flow-tree editing with branch controls
- Iterations
- Pass/fail summary
- Performance stats (P50/P90/P95/P99)

See: test-suites.md

## 10) Import/Export
Import and export Postman‑compatible collections.

See: import-export.md

## 11) AI Features

HTTP Forge integrates directly with your active **GitHub Copilot** subscription — no API keys, no external LLM configuration required.

### Generate Collection from curl (AI)

Parse a curl command into a collection with method, URL, headers, query params, and body already filled in.

Command Palette → `HTTP Forge: Generate Collection from curl (AI)` — paste a curl command and HTTP Forge creates the collection.

### Enhance Collection with AI

Fills in realistic example request bodies and `pm.test()` assertion scripts for every request. Offered as an optional step during import:

- **Import Collection** (Command Palette → `HTTP Forge: Import Collection`) — after selecting a Postman JSON file, choose **✨ Yes, enhance with AI** when prompted.
- **Import OpenAPI Spec** (Command Palette → `HTTP Forge: Import OpenAPI Spec`) — same prompt after the spec loads.

Requests that already have both a body and a test script are skipped.

### Suggest Env Variables (AI)

Scans every header, query parameter, URL segment, and request body in a collection for hardcoded values (API keys, Bearer tokens, base URLs, tenant IDs) and proposes `{{ENV_VAR}}` replacements.

- **Collection Editor** — Open a collection → **Overview** tab → **✨ Suggest Environment Variables**.
- **Collections tree** — Right-click a collection → **Suggest Env Variables (AI)**.
- **Command Palette** → `HTTP Forge: Suggest Env Variables (AI)`.

Applied replacements update the collection in place and write the original values to the active environment. A heuristic (non-AI) mode is also available if Copilot is not active.

### Request Tester — AI features

All of the following are available in the **Request Tester** panel when a request is open.

#### ✨ Scan (hardcoded value detection)

Toolbar button next to the request URL — detects hardcoded values in the current request (headers, query params, body) that should become environment variables. Results appear inline below the request line.

#### ✨ Generate body

In the **Body** tab, click the **✨** button next to the body type selector. Type a description of the payload (e.g. *"a create-user request with name and email"*) and Copilot writes the JSON body.

#### ✨ Generate with AI — scripts

In the **Scripts** tab, both the pre-request and post-response editors have a **✨ Generate with AI** button. Describe what the script should do and Copilot writes it.

#### Response toolbar (appears after any response)

After sending a request, an AI toolbar appears above the response body:

| Button | What it does |
|---|---|
| **✨ Explain** | Plain-English explanation of the response — status, headers, body fields |
| **📋 Contract Tests** | Generates `pm.test()` assertions for every field in the response JSON |
| **⬆ Extract Vars** | Extracts response fields to environment variables via `pm.environment.set()` scripts |
| **{ } TS Types** | Generates TypeScript interfaces from the response JSON |
| **↔ Compare** | Diffs the current response against the previous response for the same endpoint |
| **💬 Chat** | Opens the embedded AI chat panel (see below) |

#### 💬 AI Assistant chat

Click **💬 Chat** in the response toolbar to open a persistent, multi-turn chat panel scoped to the current request and response. Every message is sent to GitHub Copilot with an automatic context preamble containing:

- The request endpoint (`METHOD URL`)
- Last response status code
- Response `Content-Type`
- Response body (first 800 characters)

This means you can ask questions like *"Why did this return a 401?"* or *"Write a pm.test() that checks every field in this response"* without copy-pasting anything. The chat history is preserved within the session and can be cleared with the 🗑 button.

#### ✨ Enhance with AI — assertion suggestions

After a response, HTTP Forge automatically suggests `pm.test()` snippets when no assertions exist. The suggestion banner has an **✨ Enhance with AI** button — clicking it sends the snippets to Copilot to generate smarter, context-aware assertions.

### AI via MCP (agent mode)

When the MCP server is running, AI agents (Claude, Copilot in agent mode) can trigger collection enhancement and env var scanning autonomously via `ai_suggest_env_vars` and `ai_enhance_collection`. See [MCP Server](mcp-server.md#agentic-ai-tools--env-scanning-and-collection-enhancement).

## Tips
- Keep history/results out of version control.
- Use collection variables for defaults.
- Use scripts for advanced validations and chained flows.
