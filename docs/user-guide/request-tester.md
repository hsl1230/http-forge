# Request Tester

The Request Tester is the main UI for building and executing requests from the extension.

## Request line
- **Method**: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
- **Path/URL**: Absolute URL or relative path resolved against environment variables (supports Express.js route patterns like `:id`)
- **Send**: Executes the request
- **Save**: Saves updates back to the collection

### Example
```
GET {{baseUrl}}/users/:id
```

## Params tab
### Path params
- Automatically detected from `:param` or `{{param}}` patterns
- Values can be literals or `{{variables}}`

### Query params
- Each row includes an enable/disable checkbox
- Disabled rows are ignored without removing them

Example:
```
include = profile
limit = 10
```

## Authorization tab
- **Inherit**: Uses environment or collection auth
- **OAuth 2.0**: Full OAuth 2.0 support with four grant types:
  - Authorization Code (with PKCE — S256 or plain)
  - Client Credentials
  - Password
  - Implicit
  - Token caching, automatic refresh, and secure storage via VS Code SecretStorage
- **Bearer**: Token value for Bearer authentication
- **Basic**: Username and password for Basic authentication  
- **API Key**: Key/value pair, sent in header or query parameter
- **None**: No authentication

Auth settings are properly inherited when running requests in Test Suites.

## Headers tab
- Add/remove headers
- Enable/disable each header row
- Supports `{{variables}}`

## Body tab
- **JSON**: Monaco editor with formatting
- **form-data**: key/value rows + file input
- **GraphQL**: Dedicated GraphQL body type with query and variables editors (see [GraphQL](#graphql) below)
- **Raw**: plain text
- **None**

### Mustache templates
Editors now highlight Mustache templates (e.g. `{{name}}`, `{{#section}}...{{/section}}`, `{{^inverse}}`, `{{!comment}}`, `{{>partial}}`, and unescaped `{{{raw}}}`)
Highlighting overlays the existing Monaco syntax highlighting (JSON/XML/HTML/JS/plaintext) using inline decorations so native language features are preserved.
Works in request body editors and GraphQL variables editor; expressions are highlighted as a whole for readability.

Example JSON body:
```json
{
	"name": "Test User",
	"email": "test@example.com"
}
```

## GraphQL

When you select **GraphQL** as the body type, the body panel shows a dedicated GraphQL editing environment with a tabbed layout — vertical **Query** and **Variables** tabs on the left (matching the Scripts tab pattern) switch between two Monaco editors. The GraphQL toolbar (Fetch Schema, Operation Selector, Schema Explorer toggle) appears in the body-type selector bar.

### Schema Introspection
Click **⟳ Fetch Schema** to execute the standard GraphQL introspection query against the current endpoint URL. All request headers and authentication (including OAuth 2.0 tokens) are sent with the introspection request. Schemas are cached per endpoint URL — subsequent fetches use the cache unless you explicitly re-fetch.

### Context-Aware Auto-Complete
Once a schema is fetched, the query editor provides context-aware completions:
- **Fields**: Type `{` or press Ctrl+Space inside a selection set to see available fields for the current type
- **Arguments**: Type `(` after a field name to see its arguments with types and descriptions. Argument completions are provided both locally (zero-latency) and via the backend completion provider.
- **Enum values**: After an argument name and `:`, enum types show their possible values
- **Directives**: Type `@` for available directives (`@skip`, `@include`, custom directives)
- **Root keywords**: At the top level, get suggestions for `query`, `mutation`, `subscription`, `fragment`
- **Variable types**: In `($var: ...)` definitions, get input types and scalars from the schema

Completions are computed locally from the cached schema for zero-latency suggestions.

### Syntax Highlighting
The query editor uses a custom Monarch tokenizer for the GraphQL language — keywords (`query`, `mutation`, `fragment`, etc.), type identifiers (PascalCase), variables (`$name`), directives (`@skip`), strings (including `"""` block strings), comments (`#`), and numbers are all syntax-highlighted.

### Schema Explorer
Click **🔍** in the toolbar to toggle the Schema Explorer panel. The explorer lives inside the **Query** tab — toggling it on automatically switches to the Query tab. The explorer shows a navigable type tree:
- **Root types**: Query, Mutation, Subscription with their fields
- **Enums, Input Types, Interfaces, Unions, Scalars**: All schema types organized by kind
- **Expand/Collapse**: Click any type or field to expand its children
- **Search**: Filter types by name using the search box
- **Click to Insert**: Click a field name to insert it at the cursor position in the query editor

Deprecated fields are shown with strikethrough styling and a deprecation reason tooltip.

### Operation Selector
When your query document contains multiple named operations (e.g. `query GetUsers { ... }` and `mutation CreateUser { ... }`), a dropdown appears in the toolbar. Select which operation to execute — the `operationName` is included in the request body sent to the server and saved with the request.

## Scripts tab
- Pre‑request and Post‑response scripts
- Script templates are available

See: scripts-assertions.md

## Body Schema tab
The Body Schema tab lets you view and edit a JSON Schema definition for the request body. Schemas are stored in `body.schema.json` alongside each request.

### Toolbar
- **Infer from Body** — generates a JSON Schema from the current body content. If you have already sent the request, it prioritizes the resolved body (with variables substituted). Variable placeholders like `{{token}}` are resolved to dummy values before parsing.
- **Generate Example** — creates a sample JSON body from the schema currently shown in the editor. The generated example is written into the Body tab. Works for both saved collection requests and ad-hoc/unsaved requests (e.g. requests opened from external extensions like Spring API Tester). If you edit the schema in the editor, the example reflects your edits.
- **Validate Body** — validates the current body content against the stored body schema and shows errors in the status area.

### Inline metadata (Params / Headers / Query)
Each parameter, header, and query row has an expand toggle that reveals metadata fields: **type**, **description**, **required**, **format**, **enum**, **deprecated**. These annotations are exported as OpenAPI parameter metadata and saved with the request.

## Response Schema tab
The Response Schema tab lets you view and edit response schemas grouped by HTTP status code. Schemas are stored in `response.schema.json` alongside each request.

### Toolbar
- **Infer from History** — reads saved response files from execution history, groups them by status code, and infers a JSON Schema from actual response bodies. Requires that "Save Response" is enabled in settings.
- **Capture Last Response** — takes the most recent response and adds or merges it as a status code entry in the response schema.
- **Generate Example** — generates a sample JSON response from the schema currently shown in the editor, for the active status-code sub-tab. If the schema uses `$ref` references, shared `components` are resolved automatically.

### Status code sub-tabs
When a response schema has multiple status codes (e.g. 200, 400, 404), the tab shows color-coded sub-tabs: green for 2xx, amber for 4xx, red for 5xx. Click a sub-tab to view that status code's schema.

### External schema integration
Third-party extensions (e.g. Spring API Tester) can push `bodySchema` and `responseSchema` via the `openRequestContext` API. These schemas are merged with any saved data and appear in the schema tabs immediately — no manual "Infer" step needed.

## Settings tab
- Timeout
- Follow redirects
- Follow original method on redirect
- Follow auth header on redirect
- Max redirects
- Strict SSL
- Decompression

## Send execution flow
1. Resolve environment variables
2. Apply environment headers
3. Run pre‑request script
4. Send HTTP request
5. Run post‑response script
6. Save history entry
7. Render response and tests

## Response viewer
- Status, time, size
- Body (formatted JSON/XML/HTML)
- Headers and cookies tables
- Tests tab with pass/fail summary
- Console tab for script logs

### HTML preview (Raw / Preview)
- When the response body is HTML (Content-Type indicates HTML or the body looks like HTML), Request Tester prepares an HTML preview and provides a small Raw / Preview toggle in the Response → Body panel.
- Preview renders the response inside a sandboxed iframe (no scripts allowed) so you can view the rendered output safely. The Raw view always shows the original source in the Monaco editor.
- The toolbar is only shown when the Body tab is active; receiving an HTML response while another response tab is selected prepares the preview but does not surface the toolbar until you switch to Body.
- Network or execution errors are presented as a formatted HTML body (includes stack when available) so they render cleanly in the preview. Scrollbars inside the preview are styled for better contrast with the editor theme.

Behavior notes
- Detection: HTML is detected from the Content-Type header or by a simple body heuristic (body starts with "<").
- Safety: iframe is sandboxed (same-origin disabled for scripts) and preview content is injected via srcdoc or document.write fallback.

## History
See: history-shared.md
