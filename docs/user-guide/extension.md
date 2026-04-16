# HTTP Forge Extension (VS Code) Guide

This guide is written for VS Code extension users. It covers the full workflow: configuration, collections, request tester, environments, scripts, history, and suites.

## 1) Install and open
1. Install the HTTP Forge extension from VS Code Marketplace.
2. Open your workspace folder.
3. Create `http-forge.config.json` in the workspace root.

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
- Environment
- Collection
- Session

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
Suites let you run multiple requests across collections.

Key features:
- Cross‑collection selection
- Iterations
- Pass/fail summary
- Performance stats (P50/P90/P95/P99)

See: test-suites.md

## 10) Import/Export
Import and export Postman‑compatible collections.

See: import-export.md

## Tips
- Keep history/results out of version control.
- Use collection variables for defaults.
- Use scripts for advanced validations and chained flows.
