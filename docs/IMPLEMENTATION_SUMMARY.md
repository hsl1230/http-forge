# HTTP Forge - Postman Parity Implementation Summary

## ✅ RECENT: Complete SOLID Refactoring of Webview Panels (v0.13.0)

### Overview

Comprehensive refactoring of all webview panels (Environment Editor, Folder Editor, Request Tester, Test Suite) following SOLID principles. Introduced unified handler-based architecture with message router, context providers, and data providers. All panels now use composition over inheritance, enabling testability, extensibility, and code reusability. 40+ message handlers implemented across 10,000+ lines of modular TypeScript code.

### Core Architecture (`src/presentation/webview/`)

#### New Shared Interfaces (`src/presentation/webview/shared-interfaces.ts`)

- **`IWebviewMessenger`**: Abstracts panel communication
  - `postMessage(message: unknown): void`
  - Allows handlers to send messages to webview without direct panel dependency

- **`IMessageHandler`**: Base interface for all message handlers
  - `getSupportedCommands(): string[]` - Declare handled commands
  - `handle(command, message, messenger): Promise<boolean>` - Process message

- **`WebviewMessageRouter`**: O(1) centralized message routing
  - Command lookup map for fast dispatch
  - `registerHandler()` and `registerHandlers()` - Add handlers without modification (OCP)
  - `route()` - Dispatch messages to handlers
  - `getRegisteredCommands()` - Debug helper

#### Panel-Specific Interfaces (`**/interfaces.ts`)

**Request Tester** (`src/presentation/webview/panels/request-tester/interfaces.ts`):
- `HistoryStoragePath` - Storage info for request history
- `IPanelContextProvider` - Context access for handlers (DIP)
- `HistoryUIEntry` - Grouped history format
- `EnvironmentData` - Environment state for UI
- `IEnvironmentHandler`, `ICookieHandler` - Handler-specific interfaces

**Environment Editor** (`src/presentation/webview/panels/environment-editor/interfaces.ts`):
- `SharedConfig`, `LocalConfig` - Configuration structures
- `EnvironmentConfig` - Environment variables structure
- `IEnvironmentConfigProvider` - Config service interface (DIP)

**Folder Editor** (`src/presentation/webview/panels/folder-editor/interfaces.ts`):
- `FolderData` - Folder display information
- `FolderUpdate` - Folder update payload

**Test Suite** (`src/presentation/webview/panels/test-suite/interfaces.ts`):
- `SuiteRunConfiguration` - Run settings
- `SuiteRequestResult` - Per-request result format

### Request Tester Panel Refactoring

#### Panel Class (`src/presentation/webview/panels/request-tester/request-tester-panel.ts`)

Simplified to 353 lines - only handles:
- Panel lifecycle (create, dispose, reveal)
- Webview HTML content
- Message routing to handlers

Composition over inheritance - delegates all responsibilities to handlers.

#### Panel Manager (`src/presentation/webview/panels/request-tester/request-tester-panel-manager.ts`)

Manages multiple request panels with constraints:
- **No duplicates**: One panel per unique request (collectionId:requestId)
- **Max 5 panels**: LRU eviction policy
- **Unsaved check**: Prompts before overwriting panels with changes
- Features: `show()`, `closeAll()`, `notifyEnvironmentChange()`

#### Data Provider (`src/presentation/webview/panels/request-tester/panel-data-provider.ts`)

Implements `IPanelContextProvider` - Provides:
- Current request context
- History storage paths
- Collection/environment data
- Merged request data (saved + generated)
- History grouped by ticket/branch

#### Message Handlers

**9 Handlers** implementing `IMessageHandler`:

1. **`RequestExecutionHandler`** (433 lines)
   - Commands: `sendRequest`, `cancelRequest`, `sendHttpRequest`
   - Executes requests with collection/folder script context
   - Handles cookie jar, environment variables, error handling
   - Abortable via `AbortController`

2. **`SaveRequestHandler`** (191 lines)
   - Commands: `saveRequest`
   - Save to collection or create new
   - Resolves collectionId from collectionName if needed
   - Detects existing requests to update vs. create

3. **`EnvironmentSelectionHandler`** (159 lines)
   - Commands: `changeEnvironment`, `openEnvironmentEditor`
   - Provides environment data for initialization
   - Provides history grouped by ticket/branch
   - Handles external environment changes

4. **`HistoryHandler`** (242 lines)
   - Commands: `useHistoryEntry`, `deleteHistoryEntry`, `shareHistoryEntry`, `requestRenameSharedGroup`
   - Uses `IRequestHistoryService` for storage
   - Supports shared group management
   - Propagates history updates to UI

5. **`CookieHandler`** (63 lines)
   - Commands: `getCookies`, `setCookie`, `deleteCookie`, `clearCookies`
   - Uses `IAsyncCookieService` for persistence
   - Provides current cookies for initialization

6. **`VariableHandler`** (150 lines)
   - Commands: `variableChange`
   - Delegated to `EnvironmentConfigService` and `CollectionService`
   - Supports: global, environment, collection, session scopes
   - Actions: set, unset, clear

7. **`SchemaHandler`** (555 lines)
   - Commands: `getBodySchema`, `saveBodySchema`, `inferBodySchema`, `validateBody`, `captureResponse`, `generateExampleBody`, etc.
   - Body schema with validation
   - Response schema per status code
   - Schema inference from response history
   - JSON Schema validation with error reporting
   - Example generation from schemas
   - Variable placeholder resolution before JSON parsing

8. **`OAuth2Handler`** (112 lines)
   - Commands: `oauth2GetToken`, `oauth2RefreshToken`, `oauth2ClearToken`
   - Uses `IOAuth2TokenManager` for token lifecycle
   - Caches tokens with expiry detection
   - Refreshes expired tokens

9. **`GraphQLHandler`** (119 lines)
   - Commands: `graphqlFetchSchema`, `graphqlGetCompletions`, `graphqlClearSchemaCache`
   - Uses `IGraphQLSchemaService` for introspection
   - Provides context-aware completions
   - Caches schemas per endpoint

### Environment Editor Panel Refactoring

#### Panel Class (minimal)

#### Message Handlers

1. **`ReadyHandler`** - Send initial configuration data
2. **`ConfigHandler`** - Save shared/local configuration
3. **`EnvironmentCrudHandler`** - Add/delete/duplicate environments
4. **`FileHandler`** - Open config files in editor

### Folder Editor Panel Refactoring

#### Panel Class (minimal)

#### Message Handlers

1. **`ReadyHandler`** - Send initial folder data
2. **`SaveHandler`** - Save folder properties (name, description, auth, scripts)

### Test Suite Panel Refactoring

#### Message Handlers

1. **`ReadyHandler`** - Send suite and environment data
2. **`SaveHandler`** - Save suite configuration and manage requests
3. **`SuiteRunHandler`** - Execute suite with statistics and parameterized runs
4. **`BrowseDataHandler`** - File browser for data files (JSON/CSV)
5. **`ExportHandler`** - Export results to JSON/HTML formats

### Benefits of Handler Architecture

1. **Single Responsibility**: Each handler has one specific concern
2. **Open/Closed**: New handlers can be added without modifying existing code
3. **Testability**: Handlers can be unit tested in isolation
4. **Reusability**: Handlers can be composed across panels
5. **Maintainability**: Simpler panel class, cleaner separation of concerns
6. **Extensibility**: Third-party extensions can register custom handlers

### File Structure Changes

```
src/presentation/webview/
├── shared-interfaces.ts                          # IWebviewMessenger, IMessageHandler, WebviewMessageRouter
├── panels/
│   ├── index.ts                                  # Panel exports
│   ├── environment-editor/
│   │   ├── index.ts
│   │   ├── environment-editor-panel.ts
│   │   ├── interfaces.ts
│   │   └── handlers/
│   │       ├── index.ts
│   │       ├── ready-handler.ts
│   │       ├── config-handler.ts
│   │       ├── environment-handler.ts
│   │       └── file-handler.ts
│   ├── folder-editor/
│   │   ├── index.ts
│   │   ├── folder-editor-panel.ts
│   │   ├── interfaces.ts
│   │   └── handlers/
│   │       ├── index.ts
│   │       ├── ready-handler.ts
│   │       └── save-handler.ts
│   ├── request-tester/
│   │   ├── index.ts
│   │   ├── request-tester-panel.ts
│   │   ├── request-tester-panel-manager.ts
│   │   ├── panel-data-provider.ts
│   │   ├── interfaces.ts
│   │   └── handlers/
│   │       ├── index.ts
│   │       ├── request-execution-handler.ts
│   │       ├── save-request-handler.ts
│   │       ├── environment-handler.ts
│   │       ├── history-handler.ts
│   │       ├── cookie-handler.ts
│   │       ├── variable-handler.ts
│   │       ├── schema-handler.ts
│   │       ├── oauth2-handler.ts
│   │       └── graphql-handler.ts
│   └── test-suite/
│       ├── index.ts
│       ├── test-suite-panel.ts
│       ├── interfaces.ts
│       └── handlers/
│           ├── index.ts
│           ├── ready-handler.ts
│           ├── save-handler.ts
│           ├── suite-run-handler.ts
│           ├── browse-data-handler.ts
│           └── export-handler.ts
```

---

## ✅ RECENT: Full Postman Scripting API Parity (v0.12.0)

### Overview
Comprehensive audit and implementation of 18 Postman scripting API features to achieve near-complete `pm.*` API compatibility. Includes execution flow control, visual output, full CryptoJS, extended assertion chains, and a new Visualize tab in the Request Tester UI. All changes verified: 161 tests passing, TypeScript clean, extension builds.

### Core Changes (`http-forge.core/src/`)

#### `script/request-script-session.ts`
- **`pm.execution`**: Added `setNextRequest(name)` and `skipRequest()` to pre/post-response session
- **`pm.setNextRequest(name)`**: Top-level alias for `pm.execution.setNextRequest()`
- **`pm.visualizer.set(template, data)`**: Stores template and data for downstream rendering
- **`createPostmanUrl(urlString)`**: Builds Postman SDK-compatible Url object with `getHost()`, `getPath()`, `getQueryString()`, `protocol`, `host`, `port`, `path`, `query`, `hash`
- **`pm.request.url`**: Returns Url object instead of raw string
- **`pm.cookies.toObject()`**: Flat `{name: value}` cookie map
- **Request headers**: `toObject()` and `each(callback)` on `pm.request.headers`

#### `script/script-executor.ts`
- **Full CryptoJS**: AES, DES, TripleDES encrypt/decrypt, PBKDF2, all hash algorithms (SHA1/256/384/512/SHA3/MD5/RIPEMD160), HMAC, encoding helpers (Hex/Base64/Utf8/Latin1/Utf16)
- **Sandbox globals**: `xml2Json()`, `jsonStringify()`, `jsonParse()` injected into script VM context
- **`replaceIn()` on all scopes**: Added to `pm.variables`, `pm.environment`, `pm.collectionVariables`, `pm.globals`
- **`pm.iterationData`**: New variable scope with `get()`, `set()`, `has()`, `toObject()`, `replaceIn()`

#### `script/script-factories.ts`
- **HeaderList API**: Response headers wrapped with `.get()`, `.has()`, `.toObject()`, `.each()`
- **Response status getters**: `response.to.be.ok/success/error/clientError/serverError` work as both getters (no parens) and functions
- **Extended expect chain**: `.a(type)`, `.an(type)`, `.deep.equal()`, `.lengthOf()`, `.exist`, `.members()`, `.keys()`, `.string()`

#### `script/script-utils.ts`
- **Async `pm.test()`**: Test callbacks returning Promises are properly awaited via `Promise.resolve()`

#### `script/interfaces.ts`
- Added `nextRequest`, `skipRequest`, `visualizerData` to `IScriptResult` and `IScriptExecutionResult`

#### `types/types.ts`
- Added `nextRequest?: string | null` and `visualizerData?: { template: string; data?: any }` to `ExecutionResult`

#### `execution/collection-request-executor.ts`
- **skipRequest handling**: When pre-request script sets `skipRequest`, HTTP call is skipped but post-response scripts still run
- **nextRequest tracking**: Propagated through execution result for suite runner consumption
- **visualizerData propagation**: Forwarded from post-response script result to execution result

#### `script/module-loader.ts`
- **Dynamic require for crypto-js**: Changed from `require('crypto-js')` to dynamic `const mod = 'crypto-js'; return require(mod)` to prevent esbuild from failing at bundle time

### Extension Changes (`http-forge/src/`)

#### `src/shared/types/index.ts`
- Added `nextRequest?: string | null` and `visualizerData?: { template: string; data?: any }` to extension's local `ExecutionResult` interface

#### `src/webview-panels/test-suite/handlers/suite-run-handler.ts`
- **nextRequest flow control**: Suite runner loop checks `result.nextRequest` after each request — jumps to the named request, stops on `null`, or continues sequentially

#### `src/webview-panels/request-tester/handlers/request-execution-handler.ts`
- **visualizerData forwarding**: Added `visualizerData: result.visualizerData` to the `requestComplete` message payload

### Webview Changes (`http-forge/resources/features/request-tester/`)

#### `index.html`
- Added Visualize tab button (hidden by default, shown when visualizerData exists)
- Added `#response-visualize-tab` panel with sandboxed iframe and placeholder

#### `style.css`
- Added `.visualizer-iframe` styles (full width/height, dark background, hidden class toggle)
- Added `#response-visualize-tab` positioning

#### `modules/elements.js`
- Added `visualizeTabBtn`, `visualizerPlaceholder`, `visualizerIframe` DOM references

#### `modules/response-handler.js`
- **`renderTemplate(template, data)`**: Minimal Handlebars-compatible renderer supporting `{{var}}`, `{{{unescaped}}}`, `{{#each}}`, `{{#if}}/{{else}}`, nested paths
- **`updateVisualizerTab(visualizerData)`**: Renders template into sandboxed iframe via `srcdoc`, shows/hides Visualize tab button
- **`clearVisualizer()`**: Resets iframe and hides tab button
- **`handleResponse()`**: Calls `updateVisualizerTab(scriptResults.visualizerData)` when processing response

### Bug Fixes
- Fixed TypeScript error in `suite-run-handler.ts`: Extension's local `ExecutionResult` was missing `nextRequest` and `visualizerData` fields
- Fixed stale `dist/index.d.ts` in core: Rebuilt with `npx tsup` after adding new fields
- Fixed esbuild failure: `crypto-js` static require in module-loader.ts broke the bundler (changed to dynamic require pattern)

---

## ✅ RECENT: GraphQL Enhancement (v0.11.0)

### Overview
Full GraphQL development experience — schema introspection, context-aware auto-complete, syntax highlighting (Monarch tokenizer), Schema Explorer panel, and operation selection. Zero new npm dependencies: all implemented via lightweight custom tokenizer, brace-counting state machine, and Monaco Monarch language support.

### New Files Created
- **`src/services/graphql/graphql-schema-service.ts`** (~290 lines): Fetch, parse, and cache GraphQL schemas via standard introspection query (7-level deep TypeRef fragment). `GraphQLSchemaService` class uses `IHttpClient` for HTTP requests. Schema parsed from raw JSON into `GraphQLSchema` with `Map<string, GraphQLType>`. Cached per endpoint URL. `schemaToSerializable()` converts Map to plain object for webview transport. `extractOperations()` parses document for named operations. `renderTypeRef()` handles NON_NULL/LIST wrapping.
- **`src/services/graphql/graphql-completion-provider.ts`** (~370 lines): Lightweight GraphQL document context parser + completion item generator. `parseQueryContext()` uses regex + brace-counting state machine to determine context type (root/selection_set/argument/argument_value/directive/fragment_type/variable_def). `getCompletions()` dispatches to context-specific generators. `resolveFieldPath()` walks tokenized text tracking field→type transitions through the schema. Helpers: `stripCommentsAndStrings()`, `countUnmatched()`, `isInsideParentheses()`, `tokenize()`, `fieldToCompletionItem()` (with snippet insertion for required args and object sub-selections).
- **`src/webview-panels/request-tester/handlers/graphql-handler.ts`** (~120 lines): Backend message handler for webview→extension GraphQL messages. Constructor takes only `IHttpClient` — creates its own `GraphQLSchemaService` internally. Commands: `graphqlFetchSchema` (introspection — headers include Auth tab authorization), `graphqlGetCompletions` (cursor-position completions), `graphqlClearSchemaCache`. Responses: `graphqlSchemaReceived`, `graphqlSchemaError`, `graphqlCompletions`.
- **`resources/shared/graphql-language.js`** (~165 lines): Register GraphQL as a Monaco language with Monarch tokenizer. Keywords, typeKeywords (Int/Float/String/Boolean/ID), variables with `$` prefix, `@` directives, block strings `"""`, comments `#`, PascalCase type identifiers, camelCase field identifiers. Language configuration with brackets, auto-closing pairs, folding, indentation rules.
- **`resources/features/request-tester/modules/graphql-manager.js`** (~780 lines): Frontend GraphQL schema manager in webview. Schema fetching (with Auth tab authorization injection — bearer, basic, apikey, oauth2), client-side completion computation from cached serialized schema (zero-latency), Monaco `registerCompletionItemProvider('graphql', ...)` with 7 trigger characters, operation selector extraction and dropdown population (wrapped in `editorsManager.onReady()` to avoid race condition), Schema Explorer tree rendering with expand/collapse/search/click-to-insert (inside Query tab, auto-switches on toggle). Includes `getArgumentCompletionsLocal()` for parenthesis-position argument completions.

### Modified Files
- **`resources/features/request-tester/index.html`**: GraphQL toolbar (`#graphql-toolbar`) moved to `.body-type-selector` bar (next to raw format selector, hidden when body type is not GraphQL). GraphQL body panel now uses tabbed layout: vertical tabs (Query ⟩ / Variables {}) in `.graphql-tabs-vertical` with corresponding `.graphql-tab-panel` panels. Schema Explorer (`#graphql-explorer`) is inside `#graphql-query-panel` (beside query editor).
- **`resources/features/request-tester/style.css`**: ~200 lines added — GraphQL toolbar, schema status variants (success/error/warning/loading/info), graphql-content flex layout, tabbed layout (`.graphql-tabs-vertical`, `.graphql-tab-vertical`, `.graphql-panels`, `.graphql-tab-panel`) matching script tab pattern, explorer sidebar (280px) with header/search/tree, explorer-node toggle/icon with expand/collapse transitions, type-name color coding (class/enum/input/union/scalar), field styles with hover underline + deprecated strikethrough, args/desc/deprecated indicators.
- **`resources/features/request-tester/modules/monaco-editors-manager.js`**: Imports `registerGraphQLLanguage()` from shared module and calls it before template/script completion providers.
- **`resources/features/request-tester/modules/body-type-manager.js`**: `getBodyForSave()` GraphQL case now includes `operationName`. `switchPanel()` toggles `graphqlToolbar` visibility (hidden when body type is not GraphQL).
- **`resources/features/request-tester/modules/main.js`**: Imports `createGraphQLSchemaManager`, creates instance in `initializeManagers()`, spreads `getMessageHandlers()`, calls `initialize()` in Phase 7c (after Monaco and schema editors). GraphQL tab switching handler (parallel to script tabs) manages tab/panel activation and editor layout refresh.
- **`resources/features/request-tester/modules/elements.js`**: Added `graphqlToolbar` element reference.
- **`resources/features/request-tester/modules/state.js`**: Added `operationName: ''` to graphql state.
- **`src/services/service-container.ts`**: Added `GraphQLSchemaService` Symbol identifier + typed getter.
- **`src/services/service-bootstrap.ts`**: Registered `GraphQLSchemaService` singleton (depends on `IHttpClient`).
- **`src/webview-panels/request-tester/handlers/index.ts`**: Exports `GraphQLHandler`.
- **`src/webview-panels/request-tester/request-tester-panel.ts`**: Imports `GraphQLHandler`, creates instance with `container.httpClient`, registers in `WebviewMessageRouter`.

### Bug Fixes (Post-Implementation)
- Fixed variable shadowing `const document = queryEditor.getValue()` → renamed to `gqlText` in `graphql-manager.js`
- Fixed missing `operationName: ''` in `reset()` in `body-type-manager.js`
- Fixed argument completions never working — backend `parseQueryContext` now resolves `parentType`/`fieldPath` for argument and argument_value contexts
- Fixed custom scalars misidentified as objects — `fieldToCompletionItem` now checks `type.kind` instead of hardcoded scalar names
- Removed unnecessary `as GraphQLSchemaService` cast in `graphql-handler.ts`
- Fixed frontend `computeCompletionsLocally()` showing field completions inside parentheses — added `parenDepth` tracking and `getArgumentCompletionsLocal()` helper
- Removed unused `envConfigService` and `contextProvider` constructor parameters from `GraphQLHandler`
- Fixed operation selector not appearing — race condition: `graphqlSchemaManager.initialize()` ran synchronously while Monaco editors were still being created asynchronously via `MonacoViewer.whenMonacoReady()`, causing `getGraphqlQueryEditor()` to return null. Fixed by wrapping `onDidChangeModelContent` listener in `editorsManager.onReady()`.
- Fixed schema fetch ignoring Auth tab — `fetchSchema()` only read Headers tab DOM via `getHeaders()`. Added auth injection block that checks `state.authType` and injects Authorization header for bearer, basic, apikey, and oauth2 (with case-insensitive duplicate check).

### Features
- **Schema Introspection**: One-click fetch from body-type selector toolbar, standard introspection query with Auth tab authorization (bearer, basic, apikey, oauth2), cached per endpoint URL, serializable for webview transport
- **Context-Aware Auto-Complete**: 7 context types (root, selection_set, argument, argument_value, directive, fragment_type, variable_def), local computation from cached schema for zero-latency, snippet tab-stops for required args
- **Syntax Highlighting**: Full Monarch tokenizer — keywords, types, variables, directives, strings, block strings, comments, numbers, brackets
- **Tabbed GraphQL Editors**: Vertical Query/Variables tabs (matching Scripts tab pattern) replacing stacked layout. Schema Explorer inside Query tab panel.
- **Schema Explorer**: Type tree inside Query tab with root types → enums → input types → interfaces → unions → scalars, expand/collapse, search filter, click-to-insert, deprecated field indicators. Toggle auto-switches to Query tab.
- **Operation Selection**: Auto-extract named operations, dropdown selector, `operationName` in request body (listener wrapped in `editorsManager.onReady` to avoid race condition)

### Architecture
- **Zero Dependencies**: Custom tokenizer + state machine replaces `graphql-js` (680KB). Monarch replaces external syntax highlighter. `IHttpClient` reused for introspection HTTP.
- **DI Integration**: `GraphQLSchemaService` registered as singleton in `ServiceContainer`, resolved via `ServiceIdentifiers.GraphQLSchemaService`
- **Handler Pattern**: `GraphQLHandler` follows existing `IMessageHandler` interface, registered in `WebviewMessageRouter`
- **Frontend Module Pattern**: `createGraphQLSchemaManager()` follows same factory pattern as `createOAuth2Manager()` — returns `{ initialize, getMessageHandlers, ... }`

---

## ✅ RECENT: Template Engine — Filters, Expressions & String Concatenation (v0.11.0)

### Overview
A comprehensive template engine extending the `{{variable}}` syntax with Thunder Client-compatible filter pipes, sandboxed JavaScript expressions, string concatenation, and dynamic variables — all usable in URL, headers, body, params, and scripts.

### New Files Created
- **`src/utils/filter-engine.ts`** (~530 lines): Parse and apply pipe-based filters. 25+ built-in filters across string, math, encoding, hash, array, object, and validation categories. Supports chained filters, no-input `@` syntax, variable references in args (quoted = literal, unquoted = variable lookup), nested property paths via `getNestedProperty()` helper, and `applyArrayFilter()` with 9 comparison operators.
- **`src/utils/expression-evaluator.ts`** (~107 lines): Sandboxed JavaScript expression evaluation via Node.js `vm` module. `isExpression()` detects JS expressions (distinguishes from simple vars and filter chains, handles `||` vs `|`). `evaluateExpression()` runs in sandboxed context with Math, Date, JSON, String, etc. — 100ms timeout, no access to require/process/fs.

### Modified Files
- **`src/services/request-execution/variable-resolver.ts`** (~389 lines): Major upgrade — `resolveTemplateContent()` now implements 5-step pipeline: `$dynamic` variables → filter chains → variable lookup → JS expressions → original text. `resolveFilterInput()` handles `@` (no-input), string literals, `$dynamic` variables, variable lookup, and JS expressions as filter inputs. `parseDynamicArgs()` enhanced with optional `variables` parameter to resolve environment variables in unquoted dynamic variable arguments.
- **`src/services/request-execution/script-executor.ts`** (~490 lines): `replaceIn()` method upgraded from simple regex to full 5-step pipeline matching `VariableResolver`. Added `parseDynArgsWithVars()` for quoted/unquoted arg resolution, `resolveScriptFilterInput()` mirroring variable-resolver's logic.
- **`src/utils/dynamic-variables.ts`** (~229 lines): 18 dynamic variables with parameterized support ($randomInt, $guid, $uuid, $timestamp, $randomString, $randomEmail, etc.), plus encoding/decoding ($base64Encode, $base64Decode, $urlEncode, $urlDecode).

### Features
- **25+ Built-in Filters**: `upper`, `lower`, `trim`, `length`, `substring`, `replace`, `split`, `join`, `removeQuotes`, `removeSpaces`, `format`, `add`, `subtract`, `multiply`, `abs`, `btoa`, `atob`, `urlEncode`, `urlDecode`, `hash`, `hmac`, `first`, `last`, `at`, `slice`, `unique`, `filter`, `map`, `prop`, `parseJSON`, `stringify`, `isEmail`, `isUrl`, `setIfValue`, `setNull`
- **JavaScript Expressions**: `{{price * quantity}}`, `{{status === 'active' ? 'yes' : 'no'}}`, `` {{`Hello ${name}`}} ``
- **String Concatenation**: `{{firstName + ' ' + lastName}}`, `{{baseUrl + '/api/' + version}}`
- **Nested Property Paths**: `{{obj | prop("a.b.c")}}`, `{{users | map("address.city")}}`, `{{items | filter(meta.status=active)}}` — with priority for direct key lookup (handles keys containing dots)
- **No-Input Filters**: `{{@ | format("{0} {1}", firstName, lastName)}}`
- **Quoted/Unquoted Arg Semantics**: `"hello"` → always literal; `tax` → variable lookup first, fallback to literal
- **Environment Variables in Dynamic Args**: `{{$randomInt(minValue, maxValue)}}` resolves from env
- **5-Step Resolution Pipeline**: Consistent across Request Tester and Script Executor
- **`||` vs `|` Disambiguation**: `splitByPipe()` correctly distinguishes JavaScript logical OR (`||`) from filter pipe (`|`)

### Architecture
- **Single Responsibility**: `filter-engine.ts` (parse + apply filters), `expression-evaluator.ts` (JS expression sandbox), `variable-resolver.ts` (template resolution), `dynamic-variables.ts` (dynamic value generation)
- **Zero External Dependencies**: Filter engine and expression evaluator use only Node.js built-ins — no lodash or other libraries. Nested property traversal uses a simple `path.split('.').reduce()` pattern.
- **Sandboxed Execution**: VM module with 100ms timeout prevents infinite loops and malicious code

---

## ✅ RECENT: Script Template Pre-Resolution (v0.11.0)

### Overview
`{{variable}}` templates now auto-resolve directly in pre-request and post-response script source code before VM execution — no need to wrap every string in `replaceIn()`. The full 5-step pipeline (dynamic variables → filters → variable lookup → JS expressions → original text) runs on the combined script source before `vm.runInContext()`. Postman-compatible: explicit `replaceIn()` calls remain safe because already-resolved strings contain no `{{}}` markers and return unchanged.

### Modified Files
- **`src/services/request-execution/script-session.ts`**: Added `const resolvedScript = this.ctx.variables.replaceIn(combinedScript);` before `vm.runInContext()` in both `executePreRequest()` and `executePostResponse()`. The resolved script is passed to the VM instead of the raw combined script.

### Behavior
- **Before**: `const url = '{{baseUrl}}/api/users';` → literal string `{{baseUrl}}/api/users` (unresolved) — required `replaceIn()` wrapper
- **After**: `const url = '{{baseUrl}}/api/users';` → resolved string `https://api.example.com/api/users` — templates resolve automatically
- **Double-resolution safe**: If a user writes `hf.variables.replaceIn('{{baseUrl}}')`, pre-resolution resolves `{{baseUrl}}` first, then `replaceIn()` sees no `{{}}` markers and returns the string unchanged
- **All template features work**: Filters (`{{name | upper}}`), expressions (`{{price * qty}}`), dynamic variables (`{{$guid}}`), string concatenation (`{{a + b}}`)

---

## ✅ RECENT: Monaco IntelliSense for Templates & Scripts (v0.11.0)

### Overview
Context-aware code completion (IntelliSense) in all Monaco editors — request body (JSON/plaintext/XML/HTML/JavaScript), GraphQL query/variables, and pre-request/post-response script editors.

### New Files Created
- **`resources/features/request-tester/modules/template-completion-provider.js`** (~230 lines): Completion provider for `{{ }}` template expressions. Triggers on `{{` (variables + dynamic vars), `$` (18 dynamic variables with snippet tab-stops), `|` (30+ filters grouped by category). Reads live `state` object for real-time variable suggestions across all scopes (environment, collection, global, session). Registered for all 5 body languages: json, plaintext, xml, html, javascript.
- **`resources/features/request-tester/modules/script-completion-provider.js`** (~300 lines): Completion provider for `hf.*` / `pm.*` / `ctx.*` script API. Triggers on `.` with full path resolution: root members → variable scopes (`get`, `set`, `has`, `replaceIn`) → request object (`url`, `method`, `headers.add/get/upsert`, `body.mode/raw/formdata`) → response object (`status`, `json()`, `getHeader()`, `to.have.status()`, `to.be.ok()`) → cookies (`get`, `set`, `list`, `jar`) → expect chain (`equal`, `include`, `property`, `above`, `below`, `ok`, `empty`) → info (`eventName`, `iteration`). Registered for JavaScript only.

### Modified Files
- **`resources/features/request-tester/modules/monaco-editors-manager.js`**: Imports and calls `registerTemplateCompletionProviders(state)` and `registerScriptCompletionProviders()` after all editors are created, before `requestAnimationFrame` ready callback.

### Features
- **Template completions**: `{{` → all variables with scope labels and live values; `$` → 18 dynamic variables; `|` → 30+ filters with category tags and snippet parameters
- **Script API completions**: `hf.`/`pm.`/`ctx.` → full API tree with deep chain support (variables, environment, session, globals, collectionVariables, request, response, cookies, test, expect, sendRequest, info)
- **Live variable data**: Suggestions read from `state` on every keystroke — switching environments updates suggestions immediately
- **Priority ordering**: env > collection > global > session; duplicates suppressed
- **Snippet tab-stops**: Filters and methods with parameters use `$1`, `$2` tab-stops for quick filling

---

## ✅ RECENT: OAuth 2.0 Authentication (v0.11.0)

### Full OAuth 2.0 Implementation
Complete OAuth 2.0 support across all four grant types, with token caching, refresh, and secure storage.

#### New Files Created
- **`src/services/auth/oauth2-token-manager.ts`** (~400 lines): Core token manager — handles all 4 grant types (Authorization Code + PKCE, Client Credentials, Password, Implicit), token caching with TTL, automatic refresh via `refresh_token`, SecretStorage persistence for token recovery across restarts, concurrent-flow rejection, timeout cleanup
- **`src/webview-panels/request-tester/handlers/oauth2-handler.ts`**: Backend message handler for OAuth2 webview commands — `getOAuth2Token`, `clearOAuth2Token`, `clearAllOAuth2Tokens`, `oauth2Callback`
- **`resources/features/request-tester/modules/oauth2-manager.js`** (~350 lines): Frontend OAuth2 UI manager — dynamic form rendering per grant type, state sync with `syncState()`, `getConfig()` spreads existing state to preserve non-form fields, advanced options panel (audience, resource, extra params)
- **`resources/features/request-tester/oauth2.css`**: OAuth2-specific styles for form layout, token status display, grant type sections, advanced options panel

#### Modified Files
- **`src/services/request-preparer.ts`**: Integrates OAuth2 token acquisition — calls `tokenManager.getToken()` for `oauth2` auth type, injects Bearer token into headers; removed legacy `fetchOAuth2TokenLegacy`; `tokenManager` now required
- **`src/services/service-bootstrap.ts`**: Registers `OAuth2TokenManager` and `OAuth2Handler` in DI container
- **`src/extension.ts`**: Registers VS Code URI handler for OAuth2 callback (`vscode://http-forge/oauth2/callback`)
- **`src/webview-panels/request-tester/handlers/index.ts`**: Registers `OAuth2Handler` in handler map
- **`resources/features/request-tester/index.html`**: Added OAuth2 form HTML (grant type selector, per-grant fields, token status, advanced options)
- **`resources/features/request-tester/style.css`**: OAuth2 CSS imports
- **`resources/features/request-tester/modules/main.js`**: Initializes `oauth2Manager`, handles auth tab switching for OAuth2, fixed `apikey` casing
- **`resources/features/request-tester/modules/request-saver.js`**: Snapshot dirty detection now includes `basicAuth`, `apiKey`, `oauth2` states
- **`resources/request.schema.json`**: Added 8 new OAuth2 fields (`callbackUrl`, `usePkce`, `pkceMethod`, `audience`, `resource`, `extraParams`, `clientAuthentication`, `state`)

#### Features
- **Authorization Code + PKCE**: Browser-based flow via VS Code URI handler, supports S256 and plain PKCE methods
- **Client Credentials**: Server-to-server token acquisition with header or body client authentication
- **Password Grant**: Resource owner password credentials flow
- **Implicit Grant**: Browser-based implicit flow (legacy support)
- **Token Caching**: In-memory cache with TTL, avoids redundant token requests
- **Token Refresh**: Automatic refresh via `refresh_token` when access token expires
- **SecretStorage Persistence**: Tokens stored in VS Code SecretStorage, recovered on extension restart
- **Concurrent Flow Protection**: Rejects overlapping browser-based auth flows
- **Timeout Cleanup**: Pending auth callbacks cleaned up on timeout (60s default)

#### Bug Fixes (v0.11.0)
- Fixed `client_id` leaking into request body when using header-based client authentication in auth code flow
- Fixed `rawAuth.apiKey` (camelCase) vs `rawAuth.apikey` (lowercase) mismatch in main.js
- Fixed stored refresh tokens in SecretStorage never being read back on restart
- Fixed `clearAllTokens()` not clearing SecretStorage entries
- Fixed snapshot dirty detection missing `basicAuth`, `apiKey`, `oauth2` states
- Fixed pending auth callback not cleaned up on timeout
- Fixed concurrent auth flows silently overwriting pending callback

---

## ✅ RECENT: Schema Editor & Merge Improvements (v0.10.1)

### Generate Example — Editor-First Architecture
The "Generate Example" buttons on both Body Schema and Response Schema tabs now follow an **editor-first** pattern:

1. **Webview sends current editor content** in the message (`bodySchema` / `responseSchema`) so the backend always uses what the user sees in the schema tab.
2. **Backend falls back** to `findRequest()` → context lookup only when the webview doesn't provide a schema.
3. **Response example** uses the **active status-code sub-tab** (`statusCode` field) instead of always defaulting to 200.
4. **`components` preservation**: `applyResponseSchema()` now stores response-level `components` (shared `$ref` definitions) separately so they survive round-trips through the status-code sub-tab editor and are included when generating examples.

**Files changed**:
- `resources/features/request-tester/modules/schema-editor-manager.js` — buttons send editor content; `responseSchemaComponents` variable added; `exampleBodyGenerated` handler calls `setBodyValue()`; guards removed from generate buttons
- `src/webview-panels/request-tester/handlers/schema-handler.ts` — `handleGenerateExampleBody/Response` use `message.bodySchema ?? findRequest()` pattern; `findRequest()` backfills missing schema fields from context

### Merge Priority — Saved Wins Consistently
`mergeCollectionRequests()` in `panel-data-provider.ts` now uses **saved-first priority** for all fields, including `responseSchema`, `bodySchema`, `deprecated`, and `description`. Rationale: saved data represents the user's manual edits and should not be silently overwritten by freshly generated base data. Users can delete the saved request to pick up fresh values.

### Schema Load Priority
`loadSchemas()` in `schema-editor-manager.js` applies in-memory `state.requestData.bodySchema`/`responseSchema` first. Only when neither is present does it fall back to a backend round-trip (`getBodySchema`/`getResponseSchema`). This prevents stale persisted schemas from overwriting fresh data pushed by external extensions like Spring API Tester.

### findRequest() — Schema Backfill
`findRequest()` in `schema-handler.ts` now checks whether the collection item returned is missing `bodySchema` or `responseSchema`. When the in-memory context request has these fields (e.g. freshly generated by Spring API Tester), they are backfilled onto the collection item. This ensures callers (generate example, validate body, etc.) always have the freshest schema data.

---

## ✅ RECENT: OpenAPI Round-Trip Implementation (v0.10.0)

All 6 phases of the OpenAPI solution are now complete. See [OPENAPI-SOLUTION.md](docs/OPENAPI-SOLUTION.md) for the full design document.

### Phase 1 — Schema Storage Foundation ✅
- **New types**: `ResponseSchemaDefinition`, `BodySchemaDefinition`, `ResponseDefinition`, `ContentDefinition`, `EncodingDefinition`, `PathParamEntry`, `JSONSchema7` in `src/shared/types/index.ts`
- **Extended `KeyValueEntry`**: Added `type`, `required`, `description`, `format`, `enum`, `deprecated` metadata fields for OpenAPI-quality annotations
- **New JSON Schemas**: `resources/response-schema.schema.json`, `resources/body-schema.schema.json`
- **Updated `request.schema.json`**: Extended `KeyValueEntry` and `params` definitions to accept `PathParamEntry` objects
- **Collection loaders updated**: `FolderCollectionLoader` and `JsonCollectionLoader` now read/write `response.schema.json` and `body.schema.json` sidecar files
- **Files**: `src/shared/types/index.ts`, `resources/*.schema.json`, `src/services/collection/folder-collection-loader.ts`, `src/services/collection/json-collection-loader.ts`

### Phase 2 — Schema Inference Engine ✅
- **SchemaInferrer** (`src/services/openapi/schema-inferrer.ts`): Core JSON Schema inference from sample values — recursive object/array handling, format detection (date-time, email, URI, UUID, IPv4/6), nullable semantics (OAS 3.0 `nullable: true`), schema merging
- **HistoryAnalyzer** (`src/services/openapi/history-analyzer.ts`): Reads `FullResponse` files from history directories, groups by status code, infers schemas from response bodies, captures examples, identifies consistent headers
- **ScriptAnalyzer** (`src/services/openapi/script-analyzer.ts`): Regex-based static analysis of post-response scripts to extract response field paths, type hints, value hints, and expected status codes
- **SchemaInferenceService** (`src/services/openapi/schema-inference-service.ts`): Orchestrates history + script + user-edit merge with priority: user-edited > history > script hints. Handles both response and body schema inference.

### Phase 3 — OpenAPI Export ✅
- **OpenApiExporter** (`src/services/openapi/openapi-exporter.ts`, 959 lines): Generates valid OpenAPI 3.0.3 YAML/JSON from HTTP Forge collections — maps requests, auth, params, body formats, response schemas; deduplicates components; supports environment-based server URLs

### Phase 4 — OpenAPI Import ✅
- **OpenApiImporter** (`src/services/openapi/openapi-importer.ts`, 766 lines): Parses OpenAPI 3.0 specs → fully hydrated HTTP Forge collections with requests, schemas, metadata, tag-based folder structure
- **ExampleGenerator** (`src/services/openapi/example-generator.ts`, 253 lines): Generates example JSON values from JSON Schema definitions (handles allOf, oneOf, discriminators, enums, formats)
- **RefResolver** (`src/services/openapi/ref-resolver.ts`): Wraps `@apidevtools/json-schema-ref-parser` for `$ref` resolution

### Phase 5 — Schema Editor UI ✅
- **New webview tabs**: "Body Schema" and "Response Schema" tabs added to the Request Tester
- **schema-editor-manager.js** (445+ lines): Manages Monaco editor instances for schema tabs — toolbar actions (Infer from Body/History, Capture Response, Generate Example, Validate Body), response status-code sub-tabs, message passing. Generate Example buttons send current editor content to the backend. Response `components` preserved separately for `$ref` resolution.
- **schema-handler.ts** (560+ lines): Backend `IMessageHandler` supporting 10 commands: `get/save/infer BodySchema`, `get/save/infer ResponseSchema`, `validateBody`, `captureResponse`, `generateExampleBody`, `generateExampleResponse`. Generate handlers use editor-provided schema as priority, with `findRequest()` as fallback. `findRequest()` backfills missing schema fields from context.
- **Inline metadata panels**: Params, headers, query rows include expandable metadata detail panels (`form-manager.js`) for editing `type`, `description`, `required`, `format`, `enum`, `deprecated`
- **CSS**: Metadata detail panel styles (`.param-meta-detail`, `.schema-toggle`, `.meta-field`, `.enum-editor`) and schema editor tab styles (`.schema-toolbar`, `.schema-status`, `.schema-status-tabs`)
- **Bug fixes applied**:
  - Save button now enables on metadata and schema changes (snapshot tracks `paramsMeta`, `queryMeta`, `headersMeta`, `schemaData`)
  - "Infer from Body" reads live editor content and `sentRequest` body (variables already resolved) instead of saved collection body
  - Variable placeholders (`{{var}}`) resolved to dummy values before JSON parsing
  - "Capture Last Response" correctly reads `response.status` (not `statusCode`)
  - "Infer from History" uses `contextProvider.getHistoryStoragePath()` for correct `requestPath` (with folder path) and active `environment` instead of bare `collectionId` / default `'default'`

### Phase 6 — Commands & Wiring ✅
- **New VS Code commands**: `httpForge.exportOpenApi`, `httpForge.importOpenApi`, `httpForge.inferResponseSchema`
- **package.json**: Commands registered with menus (collection context menu, request context menu, view title bar), when-clauses
- **Service registration**: `SchemaInferrer`, `HistoryAnalyzer`, `ScriptAnalyzer`, `SchemaInferenceService`, `OpenApiExporter`, `OpenApiImporter` registered in DI container
- **Handler registration**: `SchemaHandler` registered in `handlers/index.ts` and wired in `request-tester-panel.ts`
- **Dependencies**: `yaml` (YAML parse/serialize), `@apidevtools/json-schema-ref-parser` (`$ref` resolution)

---

## ✅ RECENT FIXES (v1.1.1)

### Test Suite Authentication Fix
- **Problem**: Test suite runner returned 401 errors on authenticated requests
- **Root Cause**: `suite-run-handler.ts` set flat auth properties (`normalizedRequest.basicAuth`) but `request-preparer.ts` expected nested `auth.basicAuth`
- **Fix**: Changed normalization to build proper nested `auth: { type, basicAuth/bearerToken/apikey }` object
- **Files Changed**: `src/webview-panels/test-suite/handlers/suite-run-handler.ts`

### Test Suite Pass/Fail Logic Fix
- **Problem**: Requests with expected error status codes (e.g., 404) were marked as failed
- **Root Cause**: `const statusPassed = response.status >= 200 && response.status <= 302` always enforced regardless of assertions
- **Fix**: When assertions exist, use assertion results only; otherwise use HTTP status
- **Files Changed**: `src/services/request-execution/collection-request-executor.ts`

### UI Fixes
- Fixed "No results yet" showing while results were being added
- Fixed double scrollbar issues in Test Suite Results tab and Request Tester Scripts tab
- Fixed Tests tab content bleeding into Sent Request tab (CSS specificity issue)
- Fixed test results not clearing when switching requests
- Changed virtual scroll to use actual container height instead of hardcoded 400px
- **Files Changed**: 
  - `resources/features/test-suite/modules/main.js`
  - `resources/features/test-suite/style.css`
  - `resources/features/request-tester/style.css`
  - `resources/features/request-tester/modules/response-handler.js`
 - **UI Enhancements**: Response Body now supports a sandboxed HTML Preview (Raw / Preview toggle). The preview is populated immediately for HTML responses and the toolbar is shown only when the Body tab is active.
     - `resources/features/request-tester/index.html`
     - `resources/features/request-tester/style.css`
     - `resources/features/request-tester/modules/response-handler.js`
     - `resources/features/request-tester/modules/monaco-editors-manager.js`
     - `resources/features/request-tester/modules/utils.js` (isHtmlResponse)

---

## ✅ COMPLETED (Phases 1-3 Partial)

### Phase 1: Shared Services Created (SOLID Compliant)

#### 1. **Interfaces (DIP - Dependency Inversion)** ✅
- Created `ICookieJar` - Cookie management abstraction
- Created `IScriptExecutor` - Pre-request and post-response script execution
- Created `IRequestPreparationService` - Request preparation abstraction
- Added `Scripts`, `RequestSettings`, `Collection`, `CollectionFolder` interfaces
- Added `PreRequestScriptContext` and `PreRequestScriptResult` interfaces

#### 2. **CookieJar Implementation** ✅
- File: `src/services/collection-runner/cookie-jar.ts`
- Features:
  - Domain-based cookie storage
  - Cookie extraction from Set-Cookie headers
  - Cookie injection into requests
  - Expiration handling
  - Path matching
- Follows SRP: Only handles cookie management

#### 3. **ScriptExecutor Implementation** ✅
- File: `src/services/collection-runner/script-executor.ts`
- Replaced `TestScriptRunner` with enhanced version
- Features:
  - Pre-request script execution (NEW)
  - Post-response script execution (existing)
  - Variable modification support
  - Request modification support
  - vm2 sandboxing for security
  - Chai-style assertions (`agl.expect()`)
- Implements both `IScriptExecutor` and `ITestScriptRunner` (backward compatibility)
- Follows SRP and OCP principles

#### 4. **RequestPreparationService Implementation** ✅
- File: `src/services/collection-runner/request-preparation.service.ts`
- Features:
  - URL building with path params and query string
  - Header merging (request + cookies + content-type)
  - Body encoding (raw, JSON, form-urlencoded, form-data, GraphQL)
  - Variable replacement integration
  - Content-type detection
- Follows SRP: Only handles request preparation

#### 5. **Updated CollectionRequestExecutor** ✅
- File: `src/services/collection-runner/collection-request-executor.ts`
- NEW Features:
  - Pre-request script execution (Collection → Folder → Request)
  - Post-response script execution (Request → Folder → Collection)
  - Cookie injection and extraction
  - Settings support (timeout, SSL, redirects)
  - Uses RequestPreparationService for URL/header/body preparation
- Constructor now accepts:
  - `IScriptExecutor` (instead of ITestScriptRunner)
  - `IRequestPreparationService` (instead of IVariableReplacer)
  - `ICookieJar` (optional, per-run injection)
  - `Scripts` for collection-level scripts (optional)
  - `Scripts` for folder-level scripts (optional)

#### 6. **Service Container Updates** ✅
- File: `src/services/service-container.ts`
- Added `ServiceIdentifiers.ScriptExecutor`
- Added `ServiceIdentifiers.RequestPreparationService`
- Kept `ServiceIdentifiers.TestScriptRunner` for backward compatibility

#### 7. **Service Bootstrap Updates** ✅
- File: `src/services/service-bootstrap.ts`
- Registers `ScriptExecutor` as singleton
- Registers `RequestPreparationService` with VariableReplacer dependency
- Updated `CollectionRequestExecutor` to use new dependencies
- Legacy `ITestScriptRunner` resolves to `ScriptExecutor`

## ⏳ REMAINING WORK

### Phase 2: RunHandler Cookie Integration

**File to Update:** `src/webview-panels/collection-runner/handlers/run-handler.ts`

**Changes Needed:**
1. Create per-run `CookieJar` instance
2. Pass cookie jar to `CollectionRequestExecutor`
3. Support collection/folder scripts injection

**Code Changes Required:**
```typescript
import { CookieJar } from '../../../services/collection-runner';

// In startRun() method:
// Create per-run cookie jar (isolated, temporary)
const cookieJar = new CookieJar();

// Extract collection/folder scripts from collection data
const collectionScripts = collection?.scripts;
const folderScripts = currentFolder?.scripts; // Need to track current folder

// Create executor instance with per-run dependencies
const executor = new CollectionRequestExecutor(
    this.httpService,
    this.scriptExecutor,
    this.requestPrep,
    cookieJar, // Per-run jar
    collectionScripts,
    folderScripts
);

// Use executor for all requests in this run
```

### Phase 3: Request Execution Handler Updates

**File to Update:** `src/handlers/request-execution-handler.ts`

**Changes Needed:**
1. Add pre-request script execution
2. Add post-response script execution  
3. Use `RequestPreparationService` for consistency

**Code Changes Required:**
```typescript
import { IScriptExecutor, IRequestPreparationService } from '../services/collection-runner';

export class RequestExecutionHandler {
    constructor(
        // ... existing dependencies
        private readonly scriptExecutor: IScriptExecutor,
        private readonly requestPrep: IRequestPreparationService
    ) {}

    async handleSendRequest(message: any): Promise<void> {
        // 1. Run pre-request script
        if (request.scripts?.preRequest) {
            const preResult = await this.scriptExecutor.executePreRequest(
                request.scripts.preRequest,
                {
                    request: { url, method, headers, body, params, query },
                    variables: envVariables
                }
            );
            
            // Apply modifications
            if (preResult.modifiedRequest) {
                // Merge modifications
            }
        }

        // 2. Prepare request using shared service
        const preparedRequest = this.requestPrep.prepare(
            request,
            envVariables,
            cookieJar // Global persistent jar
        );

        // 3. Execute HTTP request
        const response = await this.httpService.execute(preparedRequest);

        // 4. Run post-response script
        if (request.scripts?.postResponse) {
            await this.scriptExecutor.executePostResponse(
                request.scripts.postResponse,
                { response, variables: envVariables }
            );
        }
    }
}
```

### Phase 4: Collection Schema Updates

**Files to Update:**
- Collection JSON schema files
- Collection import/export logic
- Collection editor UI

**Changes Needed:**
1. Add `scripts` field to collection root:
   ```json
   {
       "scripts": {
           "preRequest": "// Collection pre-request script",
           "postResponse": "// Collection post-response script"
       }
   }
   ```

2. Add `scripts` field to folders:
   ```json
   {
       "folders": [{
           "scripts": {
               "preRequest": "// Folder pre-request script",
               "postResponse": "// Folder post-response script"
           }
       }]
   }
   ```

3. Update Postman import to extract collection/folder scripts

### Phase 5: Additional Enhancements

**Settings Full Support:**
- Ensure all request settings are properly applied
- Add UI for collection-level default settings

**Cookie UI Updates:**
- Show cookies in collection runner results
- Add cookie clearing option
- Display cookie state between requests

**Error Handling:**
- Better error messages for script failures
- Script timeout handling
- Variable resolution error messages

**Testing:**
- Unit tests for ScriptExecutor
- Unit tests for RequestPreparationService
- Unit tests for CookieJar
- Integration tests for collection runner

## Architecture Benefits (SOLID)

### Single Responsibility Principle (SRP) ✅
- **CookieJar**: Only handles cookies
- **ScriptExecutor**: Only executes scripts
- **RequestPreparationService**: Only prepares requests
- **CollectionRequestExecutor**: Only orchestrates request execution

### Open/Closed Principle (OCP) ✅
- Services can be extended without modification
- New script types can be added to ScriptExecutor
- New body encodings can be added to RequestPreparationService

### Liskov Substitution Principle (LSP) ✅
- ScriptExecutor implements both IScriptExecutor and ITestScriptRunner
- Can substitute TestScriptRunner without breaking code

### Interface Segregation Principle (ISP) ✅
- Small, focused interfaces
- ICookieJar, IScriptExecutor, IRequestPreparationService are minimal

### Dependency Inversion Principle (DIP) ✅
- All components depend on abstractions (interfaces)
- No direct dependencies on concrete implementations
- Constructor injection for all dependencies

## Next Steps

1. **Update RunHandler** to create per-run cookie jar
2. **Update RequestExecutionHandler** to execute scripts
3. **Add collection/folder scripts** to schema
4. **Test end-to-end** with real collections
5. **Update documentation** for new features

## Files Modified

✅ Created:
- `src/services/collection-runner/cookie-jar.ts`
- `src/services/collection-runner/script-executor.ts`
- `src/services/collection-runner/request-preparation.service.ts`

✅ Modified:
- `src/services/collection-runner/interfaces.ts` (added 10+ new interfaces)
- `src/services/collection-runner/collection-request-executor.ts` (complete rewrite)
- `src/services/collection-runner/index.ts` (exports)
- `src/services/service-container.ts` (service identifiers)
- `src/services/service-bootstrap.ts` (dependency registration)

⏳ Remaining:
- `src/webview-panels/collection-runner/handlers/run-handler.ts`
- `src/handlers/request-execution-handler.ts`
- Collection schema files
- Tests

## Postman Parity Status

| Feature | Request Tester | Collection Runner | Status |
|---------|----------------|-------------------|--------|
| OAuth 2.0 authentication | ✅ All 4 grant types | ✅ Token injection | Complete |
| Template engine (filters) | ✅ 25+ filters, pipes | ✅ Same pipeline in scripts | Complete |
| JS expressions in `{{ }}` | ✅ Sandboxed VM | ✅ Same pipeline in scripts | Complete |
| Dynamic variables (18) | ✅ With env var args | ✅ With env var args | Complete |
| Pre-request scripts | ❌ Not executed | ✅ Implemented | Partial |
| Post-response scripts | ❌ Not executed | ✅ Implemented | Complete |
| Collection scripts | ❌ N/A | ⏳ Ready (needs RunHandler update) | Pending |
| Folder scripts | ❌ N/A | ⏳ Ready (needs RunHandler update) | Pending |
| Cookie handling | ✅ Global persistent | ⏳ Ready (needs RunHandler update) | Pending |
| Settings support | ✅ Implemented | ✅ Implemented | Complete |
| Variable replacement | ✅ 5-step pipeline | ✅ 5-step pipeline | Complete |
| Request preparation | ✅ Custom logic | ✅ Shared service | Complete |

## Implementation Quality

- ✅ SOLID principles followed throughout
- ✅ TypeScript interfaces for all abstractions
- ✅ Dependency injection via service container
- ✅ Backward compatibility maintained
- ✅ Code reuse maximized
- ✅ Clear separation of concerns

The foundation is complete and well-architected. Only integration work remains!
