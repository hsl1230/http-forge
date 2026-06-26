# Changelog

All notable changes to HTTP Forge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.16.0 - 2026-06-25

### Added

- **27 new MCP management tools** — AI agents (Claude, Copilot) can now author
  and manage collections, suites, and environments without touching JSON files:

  *Collection management:* `create_collection`, `rename_collection`,
  `delete_collection`, `duplicate_collection`, `create_folder`, `delete_folder`,
  `create_request`, `update_request`, `delete_request`, `get_request_script`,
  `set_request_script`, `reorder_collection_items`

  *Suite management:* `list_suites`, `get_suite`, `create_suite`,
  `update_suite_config`, `add_suite_requests`, `remove_suite_request`,
  `reorder_suite_requests`, `duplicate_suite`, `delete_suite`

  *Environment management:* `list_environments`, `get_environment_variables`,
  `select_environment`, `create_environment`, `delete_environment`,
  `set_environment_variable`, `unset_environment_variable`, `set_global_variable`,
  `get_globals`

- **`set_environment_variable` now accepts a `scope` parameter**: `"session"`
  (default, in-memory) or `"permanent"` (writes the variable to the environment
  JSON file on disk, surviving restarts).

- **`set_global_variable` now accepts a `scope` parameter**: `"session"` keeps
  the value in-memory; `"permanent"` writes it to `_global.json`.

### Changed

- **`toolPageSize` default raised from 150 to 200**: better out-of-the-box
  coverage for the average workspace without configuration.

### Internal

- **`McpExecutor.callGeneric` consolidated**: the 700-line per-tool dispatch
  table is replaced by a ~20-line delegation to `dispatchGenericTool` from
  `@http-forge/core`. Both MCP servers (extension + core standalone) now share
  a single implementation, eliminating all duplication.

- **`CACHE_BUSTING_TOOLS` moved to `mcp-dispatcher.ts`** in core and exported,
  so both servers invalidate the tool-list cache after the same set of
  write-operation tools without duplicating the list.

## 0.15.3 - 2026-06-25

### Changed

- **Extension MCP server now runs fully in-process**: the VS Code extension no
  longer delegates to the core's standalone `createMcpRuntime`. Instead it uses
  its own `McpServerService` / `McpToolRegistry` / `McpExecutor` stack, which
  are wired directly to the already-loaded in-memory services. Collections and
  environments are always current (no file re-reads), startup is instant, and
  there is zero disk I/O on every `tools/list` or `tools/call` request.

### Fixed

- **MCP server accepts `POST /mcp`** in addition to `POST /`, so standard MCP
  clients that post to the `/mcp` path (e.g. Claude Desktop with a path-qualified
  URL) work without any extra configuration.

- **MCP server body size limit** (1 MB): oversized request bodies now receive a
  JSON-RPC `-32700` error rather than being buffered indefinitely.

- **MCP report path traversal hardened**: the `/report?path=` handler now uses
  `path.resolve()` + `startsWith(allowedBase)` to validate the requested path,
  replacing the previous weaker `includes('.http-forge-cache')` check.

## 0.15.2 - 2026-06-24

### Changed

- **MCP default `toolMode` changed from `"flat"` to `"auto"`**: the server now
  automatically switches to drill-down once the request-tool count exceeds
  `drilldownThreshold` (default `100`). Small workspaces continue to use flat mode;
  larger ones get the compact generic tool set without any configuration needed.

- **MCP config defaults tightened**:
  - `maxRequestsPerCall`: `50` → `500` (better default for real-world suites)
  - `drilldownThreshold`: `200` → `100` (AI tool-selection quality degrades above ~100 tools)
  - `toolPageSize`: new field, default `150` (covers flat-mode tool list in one page)

- **MCP config values are now clamped to safe ranges** in `getMcpConfig()`:
  - `drilldownThreshold`: min 10, max 500
  - `toolPageSize`: min 10, max 1000 (`0` passes through as "no pagination")
  - `maxRequestsPerCall`: min 1, max 10000
  - `toolMode`: invalid values silently fall back to `"auto"`

- **`flat` mode logs a warning when request count exceeds 500**: setting
  `"toolMode": "flat"` on a large workspace now prints a console warning advising
  the user to switch to `"auto"` or `"drilldown"`. The mode is still honoured.

### Added

- **`list_requests` and `search_requests` now return `id`** on each request entry.
  Clients and AI agents can use this stable ID with `run_request` to target a
  specific request unambiguously, even when names are duplicated across folders.

- **`run_request` accepts `requestId`** (from `list_requests`/`search_requests`).
  When provided it takes precedence over the `request` name argument, eliminating
  ambiguity with duplicate request names. The name argument remains supported as
  a fallback.

- **Fuzzy/partial matching for collection and folder resolution**: MCP tools that
  accept a `collection` or `folder` argument now fall back through
  exact → case-insensitive → substring → (folder) segment matching before failing.
  Error messages include the full candidate list so AI agents can self-correct in
  one round-trip without calling `list_collections`/`list_folders` first.

### Documentation

- Updated all MCP configuration references in
  [docs/user-guide/mcp-server.md](docs/user-guide/mcp-server.md),
  [docs/user-guide/configuration.md](docs/user-guide/configuration.md), and
  [docs/configuration.md](docs/configuration.md) to reflect new defaults,
  add the `toolPageSize` field, and reframe `"flat"` mode as a footgun for
  large workspaces.

## 0.15.1 - 2026-06-24

### Fixed

- **MCP output channel no longer goes silent after `tools/list`**: a regression where
  calling `tools/list` (or any MCP operation) silently removed the "HTTP Forge" output
  channel has been resolved. Root cause was `bootstrapNodeRuntime` clearing the global
  `ServiceContainer` singleton that the extension host uses for its `ConsoleService` and
  all other VS Code services. MCP sub-runtimes now run in an isolated container that never
  touches the global singleton.

- **MCP `tools/list` no longer triggers redundant collection reads under concurrent load**:
  simultaneous `tools/list` requests with a cold tool cache no longer each spawn independent
  file-system walks. A pending-request registry collapses them into a single build and
  shares the result.

- **MCP flat-mode `tools/call` stopped leaking a file-system watcher per call**: internal
  container resources used for collection-ID resolution are now reliably released after each
  dispatch.

- **Collection mutation operations (`Add Request`, `Create Folder`, `Duplicate Folder`, etc.)
  no longer trigger a full disk reload on every save**: the collection service now correctly
  distinguishes self-writes from external file changes. Self-writes update the in-memory
  state directly and skip the disk reload, keeping the tree view responsive. External
  changes (e.g. pulling a collection repo) still reload from disk as expected.

- **`Create Folder` and `Add Request` now appear instantly in the tree** without waiting for
  a file-watcher debounce cycle. Previously the new item was missing from memory until the
  next reload because both operations read from a stale store cache.

- **`Duplicate Folder` now reflects the full copied tree immediately** instead of showing
  a partial or empty duplicate until the next background reload.

## 0.15.0 - 2026-06-24

### Added

- **MCP drill-down tool mode for large workspaces** (`mcp.toolMode`:
  `flat` | `drilldown` | `auto`, default `flat`). `flat` keeps one tool per
  request (best for normal workspaces). `drilldown` exposes a small fixed set of
  generic tools — `list_collections`, `list_requests`, `run_request`,
  `run_folder`, `run_collection`, `run_suite` — whose arguments select the target
  (collection/suite names provided as `enum`s so AI agents pick real values).
  `auto` switches to drill-down once the request-tool count exceeds
  `mcp.drilldownThreshold` (default `200`), keeping the tool list bounded.

### Documentation

- Documented the MCP drill-down tool mode: a new “Tool modes — flat vs
  drill-down” section in [docs/user-guide/mcp-server.md](docs/user-guide/mcp-server.md)
  (mode comparison, the six generic tools, the agent drill-down flow), plus
  `toolMode`/`drilldownThreshold` reference rows and JSON examples in
  [docs/configuration.md](docs/configuration.md) and
  [docs/user-guide/configuration.md](docs/user-guide/configuration.md).

## 0.13.7 - 2026-06-23

### Changed

- **Response body is now a raw string (Postman parity)**: `pm.response.body` is no
  longer eagerly parsed — it holds the raw response text, matching Postman. Use
  `pm.response.json()` to parse or `pm.response.text()` for the string. The legacy
  `responseBody` global is likewise always a string. Existing scripts that read
  parsed objects keep working via `json()`/`text()` and the response assertions.
  See [docs/user-guide/postman-compatibility.md](docs/user-guide/postman-compatibility.md).

### Added

- **Legacy Postman sandbox globals** so older scripts and Newman-exported
  collections run unmodified: `request`, `environment`, `globals`, `data`,
  `iteration` (both phases) and `responseBody`, `responseCode`, `responseHeaders`,
  `responseTime`, `responseCookies`, `tests[...]`, plus
  `postman.getResponseHeader()` / `postman.getResponseCookie()` (test phase), and
  the `tv4` JSON Schema validator global.

### Fixed

- **MCP tool names no longer exceed the 128-character limit** enforced by
  providers such as Anthropic. Names now use short deterministic hash tokens
  instead of the long embedded IDs; calls resolve back to the right
  request/collection/folder/suite by scanning current items (with a legacy
  fallback for already-listed names). Tool **descriptions** were also hardened to
  consistently name the request/folder/collection for better fuzzy matching.

- **MCP `tools/list` no longer returns duplicate tools**: same-named sibling
  folders previously produced identical tool names. The list is now de-duplicated
  by name. The CORS `Access-Control-Allow-Headers` also advertises `Mcp-Session-Id`.

## 0.13.6 - 2026-06-23

### Added

- **Postman-compatible async script execution**: scripts no longer end the moment
  their synchronous code returns. Pending timers (`setTimeout`/`setInterval`) and
  un-awaited Promises are drained before the request advances, so deferred
  `pm.globals` / `pm.environment` / `pm.variables` writes are committed for the
  next request — **without** needing `await`. Errors thrown inside timer/Promise
  callbacks are reported as non-fatal console errors, and runaway timers are
  bounded by the script timeout. See
  [docs/postman-compatibility.md](docs/postman-compatibility.md).
- **`scripts.timeout` config** (default `5000` ms): a per-script budget that
  bounds both synchronous CPU time and the asynchronous drain window. See
  [docs/configuration.md](docs/configuration.md).

## 0.13.5 - 2026-06-22

### Fixed

- **`pm.globals` now persists across requests**: a global set with
  `pm.globals.set()` in one request (or in a pre-request script) is now visible to
  later requests in the same run, matching Postman's workspace-wide scope.
  Globals share the same live persistence mechanism as environment variables, so
  `unset()` and `clear()` propagate too. Globals defined in `_global.json` act as
  defaults and are not removed by `unset()` / `clear()` (only session-set globals
  are).

## 0.13.4 - 2026-06-22

### Added

- **Configurable script scope** (`scripts.scope` in `http-forge.config.json`):
  choose `"shared"` (default — all script levels and both phases share one scope)
  or `"isolated"` (Postman-compatible — each level runs in its own scope, sharing
  state only through `pm.variables` / `pm.environment` / `pm.globals`). Use
  `"isolated"` for Postman collections that re-declare the same identifiers at
  multiple levels. See [docs/configuration.md](docs/configuration.md) and
  [docs/postman-compatibility.md](docs/postman-compatibility.md).

## 0.13.3 - 2026-06-22

### Added

- **Import progress feedback**: importing an OpenAPI spec now shows a progress
  notification ("Importing OpenAPI spec…"), matching the Postman collection
  import. The Collections tree refreshes once the import completes.

### Changed

- **Faster, quieter collection imports**: the collections filesystem watcher is
  now debounced, so a single import no longer triggers repeated tree reloads
  while files are still being written. This removes the burst of
  `Unexpected end of JSON input` warnings and noticeably speeds up importing
  large Postman/OpenAPI collections.


## 0.13.2 - 2026-06-22

- **Run Folder**: you can now run an individual folder inside a collection. Right-click any folder in the **Collections** tree and choose **Run Folder** — it opens the same Test Suite runner used by **Run Collection**, scoped to just that folder's requests (including nested subfolders). The results, Statistics, grouping, and HTML report are identical to a collection run, and you can **Save** the run as a reusable suite (named `Collection / Folder`).
  - **CLI**: a new `run-folder` command runs a folder headlessly: `http-forge run-folder --collection <id> --folder "Auth/Login"`. Use `--no-recursive` to run only the requests directly in that folder (excluding subfolders). All other `run-collection` options (`--environment`, `--var`, `--iterations`, `--stop-on-error`, `--delay`, `--include`, `--output`) are supported.
  - **MCP**: the MCP server now exposes a per-folder tool (`folder__<collectionId>__<path>`) for every folder in every collection, alongside the existing request/collection/suite tools. The tool accepts an optional `recursive` argument (default `true`).

## 0.13.1 - 2026-06-19

### Added

- **Grouped test-suite results**: the Test Suite results list now groups requests by **iteration**, then by **collection + folder** (matching the HTML report). Group headers carry the collection/folder path so each result row only needs the request name. Redundant `NN - ` numeric prefixes are stripped from folder segments.
- **Statistics — request labels + call counts**: the Statistics tab's Response Time table now shows the full `Collection › Folder › Request` label for each row and a new **Calls** column with the number of executions per request.
- **CLI runs appear in the History tab**: because the core runtime now always persists results, suite/collection runs executed from the CLI (even without `--include report`) show up in the VS Code **History** tab and can be loaded into the Results and Statistics tabs.
- **Postman Compatibility Matrix** guide ([docs/user-guide/postman-compatibility-matrix.md](docs/user-guide/postman-compatibility-matrix.md)) documenting supported `pm.*` script APIs and their status, including the newly added `.contain()`, `pm.response.to.have.jsonSchema()`, and `pm.test.skip()` / `fail()` / `index()`.

### Changed

- **GraphQL schema introspection uses the resolved URL**: fetching a GraphQL schema in the Request Tester now uses the resolved URL preview (with `{{variables}}` substituted) when available, falling back to the raw URL.
- **Jump-to-request expands ancestors**: clicking a request link in the HTML report timeline now opens all parent collapsible sections so the target detail is visible.

### Internal

- **Test Suite webview split into ES modules**: the monolithic `resources/features/test-suite/modules/main.js` was split into focused modules (`state`, `utils`, `statistics`, `results-view`, `suite-editor`, `run`, `history`, and a small `main` entry point) bundled by esbuild. No behavior change.

## 0.13.0 - 2026-06-18

### Added

- **Phase 3 — Cloud secret providers (`{{secret:alias/path}}`)**: Secrets stored in external vaults can now be referenced directly in request URLs, headers, body, and auth fields using the `{{secret:alias/path}}` template syntax. Supported providers:
  - **AWS Secrets Manager** — AWS SDK default credential chain (env vars, IAM roles, ECS task roles); supports `#jsonField`
  - **Azure Key Vault** — `DefaultAzureCredential` (env vars, managed identity, CLI login); supports `/version`
  - **Google Secret Manager** — Application Default Credentials; supports `/versions/<n>`
  - **HashiCorp Vault (KV v2)** — `VAULT_TOKEN` + `VAULT_ADDR`, optional `mountPath` and `X-Vault-Namespace`; no SDK required (built-in `fetch`)
  - **1Password** — `op` CLI session or `OP_SERVICE_ACCOUNT_TOKEN` service account (optional `@1password/sdk`)
  - **Doppler** — `DOPPLER_TOKEN` service token; no SDK required (built-in `https`)
  - Credentials are **never stored** in HTTP Forge — each provider delegates to its SDK/CLI/env default chain
  - All six providers work **zero-config** when the matching credentials/env vars are present; configure or add aliases in `http-forge.config.json` under `secrets.providers`
  - Cloud SDKs are **not bundled** with the extension — they're loaded on demand from the project's `scripts.modulePaths`, keeping the extension slim
  - Tokens are resolved in parallel before variable interpolation; results are request-scoped (no cross-request leakage)
  - See the [Secret Providers guide](docs/user-guide/secret-providers.md)

- **Phase 2 — OS Keychain secrets (VS Code SecretStorage)**: Environment variables can now be promoted to the OS keychain (Windows Credential Manager, macOS Keychain, Linux Secret Service) directly from the Environment Settings UI. Click the 🔒 lock icon on any environment variable row to promote it. Keychain secrets:
  - Never appear in any JSON file or git history
  - Survive VS Code restarts
  - Are resolved transparently via `{{varName}}` syntax — no change to request files
  - Can be demoted back to plaintext at any time

- **Phase 1 — CLI `--var` flag + `process.env` bridge**: The `@http-forge/cli` now accepts `--var KEY=VALUE` (repeatable) for injecting variables at runtime, and automatically bridges all `process.env` variables at lowest priority. This enables secret injection in CI/CD pipelines without storing values in config files:
  ```bash
  API_KEY=$SECRET http-forge run-suite smoke --env prod
  http-forge run-suite smoke --env prod --var apiKey=$SECRET
  ```

## 0.12.2 - 2026-06-17

### Changed

- **Documentation — MCP/CLI alignment**: Updated user and architecture docs to match current behavior across extension, core runtime, and CLI:
  - MCP report links documented as HTTP-served `report.uri` (`/report?path=...`) rather than direct `file://` paths
  - CLI MCP lifecycle usage documented as `mcp-server start|stop|status`
  - README now explicitly highlights headless/CI CLI usage and points to the standalone/CLI guide
- **CLI guide enhancements**: Added npm install instructions for `@http-forge/cli`, CLI repository link, and expanded MCP JSON-RPC usage examples (`initialize`, `tools/list`, `tools/call`, `/health`, and legacy `/tools/execute`).

## 0.12.1 - 2026-06-17

### Added

- **MCP Server — `iterations` parameter for collections**: The `collection__<colId>` tool now supports the `iterations` parameter, allowing collections to run multiple times (matching test suite behavior). When `iterations > 1`, the summary output includes the iterations count. This enables use cases like stability testing without requiring a test suite.


## 0.12.0 - 2026-06-16

### Added

- **MCP Server — collection runs now generate HTML reports**: Running a collection via the MCP server (`collection__<colId>` tool) now produces the same rich HTML report as a test suite run. Results are saved to `.http-forge-cache/results/temp-<colId>/run-*/` and the report URI is included in the tool response.

- **MCP Server — `include` parameter for collection tools**: `collection__<colId>` tools now accept the same `include` array as suite tools: `perRequest` (per-request result details), `failedOnly` (failed request details regardless of outcome). Consistent API surface across all multi-request tools.

- **MCP Server — clickable HTML report URI**: The `report` field in tool responses contains `uri` (served as `http://<host>:<port>/report?path=...`). AI clients render this as a clickable link that opens the report directly in the browser.

- **Test Suite UI — Export HTML opens rich report**: The "Export HTML" button now opens the same pre-generated HTML report produced at run time (via `HtmlReportGenerator`) rather than building a separate minimal template from in-memory data. The report is opened in the system browser via `vscode.env.openExternal`.

### Fixed

- **MCP Server — headers and query parameters not sent correctly**: When running requests via MCP, collection requests store headers and query parameters as `{key, value, enabled}[]` arrays. The executor was casting them directly as `Record<string, string>`, causing headers to be sent as `"0": "[object Object]"` instead of their real key/value pairs. All three tool types (`request__`, `collection__`, `suite__`) are now fixed — arrays are reduced to objects, disabled items are skipped, and auth/params conversion matches the UI flow exactly.

- **Test Suite — stable result directory for collection-sourced suites**: Temporary suites created from a collection ("Run as Suite" context menu) previously generated a new random ID each time, creating a new result directory per run. They now use a deterministic ID (`temp-<collectionId>`), so all runs of the same collection share a single top-level results directory.

## 0.11.28 - 2026-06-03

### Added

- **Script execution — legacy Postman API support**: Added backward-compatible `postman.*` global namespace to the VM sandbox alongside `pm.*`. Old scripts using `postman.setGlobalVariable()`, `postman.setEnvironmentVariable()`, etc. now work unchanged. Both APIs are now fully supported.

- **Script execution — legacy Postman global variables**: Response scripts can now use the legacy Postman API:
  - `responseBody` (string) — raw response body text, auto-injected before script execution
  - `tests[]` (object) — assign boolean values to create assertions, e.g. `tests["my check"] = true`. Values are automatically converted to test assertions.

- **Module loader — lodash shim expansion**: Extended lodash shim from basic functions to 25+ utility functions, providing near-complete lodash compatibility:
  - Object: `keys`, `values`, `entries`, `assign`, `merge`, `omit`, `pick`
  - Collection: `each`, `forEach`, `map`, `filter`, `find`, `reduce`, `includes`
  - Type checks: `isObject`, `isArray`, `isString`, `isNumber`, `isFunction`, `isNil`, `isEmpty`
  - These functions now work even when lodash is not installed via `modules/package.json`

### Fixed
- **Module loader — error handling**: Built-in modules (uuid, crypto, path, lodash, moment, etc.) are now always available without requiring a `modules/` directory. The error "no valid modules/ directory found" now only appears when attempting to load relative paths or workspace modules. This allows scripts to use `require('crypto')`, `require('uuid')`, etc. without additional setup.

- **OpenAPI export — host-variable URL stripping**: Request URLs that begin with an arbitrary `{{varName}}` host variable (e.g. `{{dcqHost}}/DCQ/templates/GetEpg`) are now handled correctly. Previously, only `{{baseUrl}}`-style names were stripped; any other variable became a spurious path segment (`/{dcqHost}/...`). The exporter now strips any leading `{{varName}}`, resolves it via the selected environments, and adds a concrete server entry. When the variable is unresolvable, an OAS server-variable entry is emitted: `url: '{varName}', variables: { varName: { default: '' } }`.

- **OpenAPI export — environment variable placeholders in examples**: `{{varName}}` tokens in parameter examples (path, query, header) and request body examples are now replaced with `<varName>` so the exported spec contains readable placeholders rather than raw template syntax or exposed configuration values.

## 0.11.27 - 2026-05-28

### Added

- **Duplicate Collection**: Right-click a collection in the Collections tree → **Duplicate Collection**. Creates a full copy including all folders, requests, scripts, schemas, and body files.
- **Duplicate Folder**: Right-click a folder → **Duplicate Folder**. Copies the folder and all nested requests within the same collection.
- **Duplicate Request**: Right-click a request → **Duplicate Request**. Copies the request into the same folder.

### Changed

- **Dead code removal**: Removed unused files (unwired V2 / orchestrator / command layer). No public API changes — only internal code that was never imported or referenced.
- **Dirty indicator on tab title**: The tab title now shows a `●` prefix (e.g., `● GET /users`) when there are unsaved changes, matching VS Code's native editor convention.

## 0.11.26 - 2026-05-26

### Added

- **Save-on-close confirmation**: When closing a request panel with unsaved changes, a modal dialog prompts "Save" or "Don't Save" — preventing accidental data loss. Works for both collection requests and suite request editors.
- **Confirm-before-overwrite dialog**: When opening a new request in a panel with unsaved changes, a unified modal offers four options: "Save & Continue" (saves then opens new), "Discard" (overwrites without saving), "Open in New Panel" (keeps dirty panel, opens new one), or Cancel. Replaces the previous "Overwrite / Open in New Panel" dialog.
- **Open Original** menu action: Suite request context menu (`⋯`) now includes "↗ Open Original" — opens the source collection request in a standard Request Tester panel (no suite context), allowing direct editing of the collection version.

### Changed

- **Save button highlight**: The Save button now shows a pulsing visual indicator (`.has-changes` class) when the panel has unsaved modifications, providing clear at-a-glance feedback.
- **`dirtyStateChanged` includes request state**: The webview dirty notification now sends the full request data snapshot, enabling the extension to save on close without requiring the webview to still be alive.

## 0.11.25 - 2026-05-22

### Added

- **Suite description**: Editable description field in the suite header (between name and Run/Stop buttons). Click to edit via dropdown textarea overlay (no layout shift). Hover shows full multi-line tooltip preserving newlines. Persisted in suite JSON.
- **Per-request description**: Each request in a suite now has a description line below its name. Same interaction: click to edit (overlay textarea), hover for multi-line tooltip. Documents what each request does in the test flow.

### Changed

- **Modified badge → dot indicator**: The "modified" text badge on customized requests is now a compact 6px colored dot, saving horizontal space while remaining visible at-a-glance.
- **Menu trigger hover-reveal**: The `⋯` action menu button is now hidden by default and appears on row hover, reducing visual noise.

## 0.11.24 - 2026-05-21

### Fixed

- **Suite runner executes only first instance of duplicate requests**: When the same request was added to a suite multiple times (each with different customizations), only the first instance's data was used for all executions. The runner now resolves each entry by its unique `slug` via `getRequestBySlug()` instead of `getRequestWithContext(collectionId, requestId)` which always matched the first occurrence.
- **Adding requests to suite produces generic slugs (`request`, `request-2`, ...)**: The webview only sent `collectionId`, `requestId`, and `enabled` when adding requests. Without `name`, slug generation fell back to `'request'`. Now sends `name`, `method`, `collectionName`, and `folderPath` so `generateSlug()` always produces meaningful slugs like `get-content-videourl-t7`.

### Changed

- **Dead code cleanup**: Removed unused `selectedRequestKeys` array from suite run handler.

## 0.11.23 - 2026-05-20

### Added

- **Property/index access in templates**: Use `{{arr[0]}}`, `{{obj.key}}`, or chained access `{{arr[0].name}}` directly in URLs, headers, and body fields. Works with typed variables stored via `pm.*.set()` — consistent behavior with filter pipes like `{{arr | first}}`.

### Fixed

- **Filter pipes in scripts cause syntax errors**: Using `{{variable | filter}}` inside `pm.test()` or other script strings (e.g. `pm.test("Found {{ids | first}}", ...)`) caused "missing ) after argument list" errors. The script executor's `replaceIn` now correctly deserializes typed variables before passing them to filters.

## 0.11.22 - 2026-05-20

### Added

- **Typed variable support in template filters**: Array, object, number, and boolean variables set via `pm.environment.set()` (or any scope) now work directly with filter pipes. For example, `{{users | first}}` correctly extracts the first element from an array variable, and `{{config | prop("retries")}}` reads a nested property from an object variable — no manual `parseJSON` filter needed.

### Changed

- **Type-safe variable serialization**: Non-string values stored via `pm.*.set()` use an internal type marker to distinguish typed values from plain strings. This eliminates the ambiguity where a string `"true"` could be confused with a boolean `true`. The `get()` API always returns the exact type that was stored.

## 0.11.21 - 2026-05-20

### Fixed

- **Save Suite loses request customizations**: The "Save Suite" action now includes the `slug` field when serializing requests. Previously, saving a suite from the webview dropped the slug mapping, causing all folder-based request customizations (body, headers, scripts, auth) to become unlinked.
- **Duplicate Suite loses request customizations**: The "Duplicate Test Suite" command now copies the source suite's request folders to the new suite directory. Previously, only the suite metadata was duplicated while the actual request data (stored in `<suiteDir>/<slug>/`) was not copied.
- **Save button enabled without changes in suite edit mode**: When editing a suite request, the save button now starts disabled (clean state) and only enables after actual modifications. Previously it was auto-enabled on panel load.
- **Delete history run confirmation**: Moved `window.confirm()` (which doesn't work in VS Code webviews) to a proper `vscode.window.showWarningMessage` modal dialog on the extension host.
- **"Back to latest" reloads correctly**: Clicking "Back to latest" now loads the most recent run via the standard history-load path instead of clearing state to an empty view.
- **Config inputs not updated on history load**: Loading a historical run now updates the iterations, delay, and stop-on-error inputs to reflect that run's configuration.

### Changed

- **Dead code cleanup**: Removed unused `log()` function and deprecated state properties from test suite `main.js`.

## 0.11.20 - 2026-05-19

### Fixed

- **Test Suite result filename mismatch**: `buildResultFileName()` in the webview now applies `sanitizeName()` to the requestId before interpolating, matching the backend `ResultStorageService` behavior. Previously, result files with uppercase or special characters in requestId could not be loaded from the Results tab.

### Removed

- **Dead code cleanup**: Removed `getStatusIcon()` and `renderResultItem()` from test suite `main.js` — both were unreachable.

## 0.11.19 - 2026-05-01

### Added

- **Suite Request Customization**: Edit individual requests within a test suite without modifying the source collection. Changes are stored in a per-request folder under the suite directory (`<suiteDir>/<slug>/request.json`).
  - **Edit button**: Open a suite request in the Request Tester panel for editing (URL, params, headers, body, auth, scripts)
  - **Reset to Collection**: Revert a customized suite request back to the latest version from the source collection
  - **Modified badge**: Visual indicator on requests that have been customized
  - **Suite-aware save**: "Save to Suite" button in Request Tester persists changes to the suite folder, not the collection
  - **Isolated panels**: Suite editors open in separate panels from collection editors — they never overwrite each other
  - **Schema/Doc restrictions**: Body Schema, Response Schema tabs and per-field OpenAPI schema toggles are hidden in suite edit mode; Document tab is also hidden
- **Suite Run History**: Browse, load, and delete past suite run results
  - **History tab**: Lists all past runs with pass rate, duration, and status
  - **Load historical run**: Populates both the Results tab (with virtual-scrolled request summaries) and the Statistics tab (per-request response times: min, avg, p95, p99, max)
  - **Delete run**: Remove old run data from disk
  - **History banner**: Shows which historical run is being viewed with a "Back to Latest" button

### Changed

- **Request list actions dropdown**: The per-request action buttons (Edit, Reset, Delete) are now consolidated into a single `⋯` dropdown menu, reducing row width and preventing layout wrapping. The `request-status` icon has been removed from the request list.
- **Panel isolation for suite vs collection**: When a suite editor is focused, opening a collection request creates a new panel instead of overwriting the suite editor (and vice versa).

### Fixed

- **History Load button not working**: The `loadHistoryRun` and `deleteHistoryRun` functions were inaccessible from inline `onclick` handlers because the esbuild bundle wraps code in an IIFE. Replaced with `addEventListener` pattern.
- **Statistics tab not populated on history load**: Loading a historical run now converts `manifest.requestStats` into the format expected by `renderStatistics()` and renders the Statistics tab.
- **Suite request data not loaded**: When editing a suite request, the panel now skips the collection-merge logic so the resolved request (from suite folder first, collection fallback) is used directly.

## 0.11.18 - 2026-04-30

### Changed

- **Session scope removed**: The separate "session" variable scope has been removed. `pm.environment.set()` now persists to workspace state (matching Postman's behavior). Variable resolution uses a 5-scope cascade: `variables > iterationData > environmentVariables > collectionVariables > globals`. The `pm.session` alias now delegates to `pm.environment`.

### Fixed

- **Request preparer extraVariables**: All request resolutions (params, query, headers, bearer auth, basic auth, API key) now use `extraVariables` when available. Previously only body and URL used extra variables, causing stale `{{variable}}` resolution in auth fields during collection runs.

## 0.11.17 - 2026-04-29

### Added

- **Sensitive data redaction**: History files, shared history, suite test results, and full response files now automatically redact sensitive data before writing to disk. Detected patterns include:
  - **Headers**: `Authorization`, `Proxy-Authorization`, and any header containing `token`, `cookie`, `secret`, `credential`, `api-key`, `bearer`, or `session-id` (e.g. `avs-token`, `telus-access-token-cookie`, `up-cookie`)
  - **URL query params**: Parameters with names containing `password`, `token`, `secret`, `api_key`, `client_secret`, etc.
  - **Request body fields**: JSON keys and URL-encoded form fields matching sensitive name patterns are redacted recursively
  - **Response headers/cookies**: `Set-Cookie` and other sensitive response headers are redacted in stored full responses
  - Unresolved templates (`{{variable}}`) in `originalConfig` are preserved untouched — only resolved values are redacted
  - Redacted values are replaced with `***`

### Fixed

- **Collection runner variable propagation**: Fixed a bug where `pm.environment.set()` in a post-response script did not propagate correctly to `{{variable}}` resolution in subsequent requests. The script session's `modifiedEnvironmentVariables` was returning a stale snapshot instead of the live scope mutated by `pm.environment.set()`. Now uses live scope references for accurate variable extraction.
- **Cookie jar flush in collection runner**: The cookie jar's `flush()` method is now called in the `finally` block of the suite runner, ensuring script-set cookies are persisted to the shared session store after a collection run completes.

## 0.11.15 - 2026-04-28

### Added

- **Full OpenAPI 3.0 constraint alignment**: The metadata panel for parameters, headers, and query params now supports all OpenAPI 3.0 Schema Object constraint fields organized into type-dependent groups:
  - **String**: `pattern`, `minLength`, `maxLength`
  - **Numeric**: `minimum`, `maximum`, `exclusiveMinimum` (boolean checkbox), `exclusiveMaximum` (boolean checkbox), `multipleOf`
  - **Array**: `minItems`, `maxItems`, `uniqueItems`
  - **Common**: `nullable`
- **Type-dependent constraint visibility**: Constraint groups show/hide based on the selected type. Selecting `string` hides Numeric and Array groups; selecting `integer`/`number` hides String and Array groups; selecting `array` hides String and Numeric groups. No type selected shows all groups.
- **Auto-clear hidden constraint fields**: When the type changes and a constraint group is hidden, its fields are automatically cleared (inputs reset to empty, checkboxes unchecked) to prevent stale values from persisting in the metadata.
- **Type validation in oneOf variants**: `matchesVariant()` now validates the value against the variant's declared `type` — `integer` requires `/^-?\d+$/`, `number` requires a parseable number, `boolean` requires `true`/`false`. Previously, type-only variants acted as catch-all matches.

### Fixed

- **oneOf/enum leak in OpenAPI export**: When merging parameters with different constraint kinds (e.g., `enum` + `pattern`), top-level constraints like `enum` could survive alongside `oneOf` in the exported schema, producing invalid OpenAPI. `stripConstraints()` now runs after all three branches of the different-kinds merge.
- **Data loss when incoming parameter has oneOf**: When an existing parameter with simple constraints (e.g., `enum`) collided with an incoming parameter that already had `oneOf` (from a prior import), the incoming's `oneOf` variants were lost because `buildVariantSchema()` doesn't copy nested `oneOf`. Added a dedicated `else if (is.oneOf)` branch that wraps existing as a single variant and flattens the incoming's variants.
- **Duplicate blur validation listeners**: `attachBlurValidation()` could stack duplicate `blur` event listeners on the same input element when metadata was updated repeatedly (via `syncValueElementFromMeta`). Fixed by storing the handler reference as `inp._blurValidator` and removing the previous listener before attaching a new one.
- **`exclusiveMinimum`/`exclusiveMaximum` as booleans**: Corrected these fields from numbers (OpenAPI 3.1 style) to booleans (OpenAPI 3.0 style) across types, UI (checkboxes), exporter, importer, and validator. In OpenAPI 3.0.3, `exclusiveMinimum: true` means strict `>` on the `minimum` value.

## 0.11.14 - 2026-04-27

### Added

- **Combobox for oneOf+enum parameters**: When a parameter has both `enum` and `oneOf` (e.g. from collision-merged variants where some variants are pattern-based), the Request Tester renders an editable combobox (`<input>` + `<datalist>`) instead of a strict `<select>`. This allows users to pick from known enum values or type pattern-matched values not in the enum.
- **Full panel reset on request switch**: Opening a new request in an existing Request Tester panel now performs a comprehensive reset of all tabs and sections before populating the new data. Dirty tracking is suppressed during loading so intermediate form changes don't emit false `dirtyStateChanged` events.

### Fixed

- **API Key auth section not hidden on reset**: When switching to a request without API Key auth, the API Key section and its form fields were not being cleared/hidden. Now all auth sections (Bearer, Basic, API Key, OAuth2) are uniformly reset.
- **Stale state after request switch**: Fixed multiple state leak issues when switching requests in an existing panel:
  - OAuth2 cached token and token UI now cleared (new `oauth2Manager.reset()`)
  - GraphQL cached schema, completions, explorer, and status now cleared (new `graphqlSchemaManager.reset()`)
  - Body and Response schema editors now cleared before loading (new `clearSchemas()` in schema-editor-manager)
  - Cookie preview in Settings tab now cleared or updated
  - History sidebar now always re-rendered (empty list if no history provided)
  - `lastResponse`, `lastSentRequest`, `activeHistoryEntryId` cleared to `null`
  - Collection/environment state uses unconditional assignment with fallbacks instead of guarded `if` checks

## 0.11.13 - 2026-04-27

### Added

- **OpenAPI collision-aware export**: When multiple requests normalize to the same path and HTTP method, the exporter now merges them into a single operation — appending descriptions, unioning tags, merging parameters (same constraint kind merged in place, different kinds wrapped in `oneOf`), and adding new response codes and content types.
- **Full parameter constraint round-trip**: OpenAPI import and export now preserve all schema constraint fields: `pattern`, `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `minLength`, `maxLength`, and `oneOf`. These are stored on `KeyValueEntry` and `PathParamEntry` and round-trip without data loss.
- **Constraints display in Request Tester**: The inline metadata panel for parameters, headers, and query params now shows a read-only "Constraints" section for `pattern`, min/max values, and length constraints. Parameters with `oneOf` (from merged collision variants) show a "Schema Variants" section.

### Fixed

- **`format` vs `pattern` validation**: Fixed incorrect use of `format` (a semantic hint like `"uuid"`, `"date-time"`) as a regex pattern for blur validation. `pattern` (the actual regex) is now used for validation; `format` is displayed as a tooltip hint only. This aligns with the OpenAPI 3.0 specification where `pattern` is enforced and `format` is advisory.

## 0.11.11 - 2026-04-24

### Added

- **Request Tester URL preview**: The Request Tester now resolves the preview URL using backend environment resolution, dynamic variables, filter/pipe expressions, and auth query params so the preview matches actual request execution.


## 0.11.9 - 2026-04-16

### Added

- **Document Tab**: New "Document" tab in the Request Tester panel displays request-level Markdown documentation from `doc.md` files stored alongside `request.json` in folder collections. Includes rendered Markdown view and an "Open File" button to edit the source.
- **File Watching — Collections**: Collection file changes (create, edit, delete) now auto-refresh the Collections tree view and all open Request Tester panels. No manual refresh needed.
- **File Watching — Environments**: Environment JSON file changes now auto-refresh the Environments tree view and all open Request Tester panels.
- **Request Documentation (`doc.md`)**: Each request folder can now include a `doc.md` file for inline API documentation, persisted as a `doc` field on `UnifiedRequest` / `CollectionRequest`.
- **Panel Auto-reload**: Open Request Tester panels automatically reload data from disk when underlying collection or environment files change externally (e.g. via a text editor, git operations, or another VS Code tab).

## 0.11.6 - 2026-04-06

### Fixed / Improved

- **Request Tester**: Path parameters, query parameters, and headers with `enum` arrays in their metadata now render as select dropdowns instead of text inputs. The `pattern` field provides regex validation on blur; the `format` field is shown as a tooltip hint. For path params, metadata takes priority over URL-constraint-derived values.
- **Request Tester`: show shared cookie in the header of sent request.

## 0.11.4 - 2026-03-19

### Added

- **Complete SOLID Refactoring of Webview Panels**: Comprehensive architectural refactoring of all webview panels (Environment Editor, Folder Editor, Request Tester, Test Suite) following SOLID principles. Introduced unified handler-based architecture with message router, context providers, and data providers across 40+ message handlers and 10,000+ lines of modular TypeScript code.
  - **Shared Interfaces** (`src/presentation/webview/shared-interfaces.ts`):
    - `IWebviewMessenger`: Abstracts panel communication, allows handlers to send messages without direct panel dependency.
    - `IMessageHandler`: Base interface for all message handlers with `getSupportedCommands()` and `handle()` methods.
    - `WebviewMessageRouter`: Centralized O(1) command dispatch using internal command map. New handlers can be registered without modifying existing code (Open/Closed Principle).
  - **Request Tester Panel Refactoring** (~350 lines):
    - Simplified panel class handles only lifecycle, webview HTML, and message routing.
    - `RequestTesterPanelManager` manages multiple request panels with constraints: no duplicates (one per unique request), max 5 panels open, LRU eviction policy.
    - `PanelDataProvider` implements `IPanelContextProvider` — provides current context, history storage paths, merged request data (saved + generated).
    - **9 Message Handlers** delegating specific concerns:
      1. `RequestExecutionHandler` (433 lines) — HTTP execution with collection/folder script context, cookie jar, environment variables, abortable via AbortController.
      2. `SaveRequestHandler` (191 lines) — Save request to collection or create new, resolves collectionId from collectionName.
      3. `EnvironmentSelectionHandler` (159 lines) — Environment selection, history grouped by ticket/branch, external environment change handling.
      4. `HistoryHandler` (242 lines) — Request history: use/delete/share entries, rename/move shared groups.
      5. `CookieHandler` (63 lines) — Cookie CRUD via `IAsyncCookieService`.
      6. `VariableHandler` (150 lines) — Global/environment/collection variable management.
      7. `SchemaHandler` (555 lines) — Body/response schema operations: get, save, infer, validate, capture, generate examples with JSON Schema support.
      8. `OAuth2Handler` (112 lines) — OAuth 2.0 token lifecycle via `IOAuth2TokenManager`.
      9. `GraphQLHandler` (119 lines) — GraphQL introspection & completions via `IGraphQLSchemaService`.
  - **Environment Editor Panel Refactoring**:
    - `ReadyHandler` — Send initial configuration data.
    - `ConfigHandler` — Save shared/local configuration.
    - `EnvironmentCrudHandler` — Add/delete/duplicate environments.
    - `FileHandler` — Open environment config files in editor.
  - **Folder Editor Panel Refactoring**:
    - `ReadyHandler` — Send initial folder data with item counts.
    - `SaveHandler` — Save folder properties (name, description, auth, scripts).
  - **Test Suite Panel Refactoring**:
    - `ReadyHandler` — Send suite and environment data.
    - `SaveHandler` — Suite configuration and request management.
    - `SuiteRunHandler` — Execute suite with statistics and parameterized runs.
    - `BrowseDataHandler` — File browser for data files (JSON/CSV).
    - `ExportHandler` — Export results to JSON/HTML with formatted report generation.
  - **Architecture Benefits**:
    - Single Responsibility: Each handler has one specific concern.
    - Open/Closed: New handlers can be added without modifying existing code.
    - Testability: Handlers can be unit tested in isolation.
    - Reusability: Handlers can be composed across panels.
    - Maintainability: Simpler panel class, cleaner separation of concerns.
    - Extensibility: Third-party extensions can register custom handlers.
  - **Panel-Specific Interfaces**: Each panel defines focused interfaces (Request Tester: `IPanelContextProvider`, `HistoryStoragePath`; Environment Editor: `IEnvironmentConfigProvider`; Test Suite: `SuiteRunConfiguration`, etc.).
  - **Type Safety**: All handlers implement `IMessageHandler`; panels and handlers depend on abstractions, not concrete implementations (Dependency Inversion Principle).

### Fixed / Improved

- **Request Tester`: Panel now properly tracks unsaved changes (`isDirty` state) for smart panel reuse.
- **Schema Handler**: Variable placeholder resolution (`{{var}}`) now handles edge cases in JSON before parsing (bare values, mixed strings).
- **Folder Editor**: Comprehensive folder context with item counts, auth, and script support.
- **Test Suite**: Memory-efficient result storage via `ResultStorageService` for large test runs.


## 0.11.3 - 2026-03-15

### Added

- **Full Postman Scripting API Parity**: Comprehensive update bringing near-complete `pm.*` API compatibility with Postman. 18 feature gaps identified and resolved.
  - **Async `pm.test()` support**: Test callbacks returning Promises are properly awaited.
  - **Expect chain assertions**: `.to.be.a(type)` / `.to.be.an(type)`, `.to.deep.equal()`, `.to.have.lengthOf()`, `.to.exist`, `.to.have.members()`, `.to.have.keys()`, `.to.have.string()`.
  - **`pm.iterationData`**: Read-only variable scope for data-driven testing with iteration variables.
  - **Response status getters**: `pm.response.to.be.ok`, `.success`, `.error`, `.clientError`, `.serverError` work as both getters (Postman-style) and function calls.
  - **Response headers HeaderList API**: `pm.response.headers.get()`, `.has()`, `.toObject()`, `.each()`.
  - **`pm.cookies.toObject()`**: Returns flat `{name: value}` cookie map.
  - **`pm.cookies.jar()`**: Full cookie jar API with `set()`, `get()`, `clear()`, `getAll()`.
  - **`replaceIn()` on all variable scopes**: Available on `pm.variables`, `pm.environment`, `pm.collectionVariables`, `pm.globals`.
  - **Sandbox globals**: `xml2Json()`, `jsonStringify()`, `jsonParse()` available as top-level functions in scripts.
  - **Request headers API**: `pm.request.headers.toObject()`, `.each()`.
  - **`pm.execution.setNextRequest(name)`**: Runner flow control — jump to a named request or stop execution with `null`.
  - **`pm.execution.skipRequest()`**: Skip the HTTP call from pre-request scripts.
  - **`pm.setNextRequest(name)`**: Top-level alias for `pm.execution.setNextRequest()`.
  - **`pm.visualizer.set(template, data)`**: Custom HTML visualization with Handlebars-compatible template rendering.
  - **Visualize tab in Request Tester**: Rendered visualizer output displayed in a new Visualize tab alongside Body/Headers/Tests.
  - **`pm.request.url` as Postman Url object**: SDK-compatible Url with `getHost()`, `getPath()`, `getQueryString()`, `protocol`, `host`, `port`, `path`, `query`, `hash`.
  - **Full CryptoJS**: AES/DES/TripleDES encrypt/decrypt, PBKDF2, all hash algorithms, HMAC, and encoding helpers (Hex/Base64/Utf8/Latin1/Utf16) — in addition to previously available hash/HMAC support.

### Fixed / Improved

- **Suite runner `setNextRequest` flow control**: The suite runner loop now respects `pm.setNextRequest()` — jumps to the named request, stops on `null`, or continues sequentially when unset.
- **Suite runner `skipRequest` handling**: Pre-request scripts calling `pm.execution.skipRequest()` cause the runner to skip the HTTP call while still executing post-response scripts.
- **Extension local `ExecutionResult` type**: Added `nextRequest` and `visualizerData` fields to the extension's local type definition (was causing TypeScript errors in suite-run-handler.ts).
- **Core `dist/index.d.ts` stale types**: Rebuilt core with tsup to regenerate type declarations after adding new fields to `ExecutionResult`.
- **`crypto-js` bundler fix**: Changed static `require('crypto-js')` to dynamic require pattern in module-loader.ts to prevent esbuild from failing at bundle time (crypto-js is loaded at runtime only when installed by the user).


## 0.11.0 - 2026-03-02

### Added

- **GraphQL Enhancement — Schema Introspection, Auto-Complete & Explorer**: Full GraphQL development experience with zero new dependencies — all via lightweight custom tokenizer, state machine parser, and Monaco Monarch language support.
  - **Schema Introspection**: One-click "Fetch Schema" in the body-type selector toolbar executes the standard introspection query against the current endpoint URL (with all request headers and Auth tab authorization — Bearer, Basic, API Key, OAuth 2.0 — applied). Schemas are cached per endpoint for instant reuse.
  - **Context-Aware Auto-Complete**: Schema-driven completions in the GraphQL query editor — fields, arguments, enum values, directives, fragment types, and variable definitions. A lightweight brace-counting state machine resolves the cursor context without the 680KB `graphql-js` dependency.
  - **GraphQL Syntax Highlighting**: Full Monarch tokenizer for the `graphql` Monaco language — keywords, type identifiers, variables (`$`), directives (`@`), strings (including `"""` block strings), comments (`#`), numbers, and bracket matching.
  - **Tabbed GraphQL Editors**: Vertical Query and Variables tabs (matching the Scripts tab pattern) replace the previous stacked layout. Schema Explorer lives inside the Query tab panel.
  - **Schema Explorer Panel**: Collapsible type tree inside the Query tab showing Query, Mutation, Subscription root types, enums, input types, interfaces, unions, and scalars. Search/filter box, expand/collapse all, click-to-insert fields into the query editor. Deprecated fields shown with strikethrough. Toggling the explorer on automatically switches to the Query tab.
  - **Operation Selector**: Dropdown auto-populated from named operations in the query document — select which operation to execute. `operationName` is included in the request body and saved with the request.
  - **Backend Services**: `GraphQLSchemaService` (DI-registered singleton) for introspection + schema parsing + caching. `GraphQLCompletionProvider` for context analysis + completion generation. `GraphQLHandler` message handler for webview↔extension communication.
- **Template Engine — Filters, Expressions & String Concatenation**: A powerful new template engine extending the `{{  }}` variable syntax with Thunder Client-compatible filter pipes, sandboxed JavaScript expressions, and string concatenation — all usable in URL, headers, body, params, and scripts.
  - **25+ Built-in Filters**: Pipe-based filter syntax `{{variable | filter1 | filter2(args)}}` with chaining support. Includes: `upper`, `lower`, `trim`, `length`, `substring`, `replace`, `split`, `join`, `removeQuotes`, `removeSpaces`, `format`, `add`, `subtract`, `multiply`, `abs`, `btoa`, `atob`, `urlEncode`, `urlDecode`, `hash`, `hmac`, `first`, `last`, `at`, `slice`, `unique`, `filter`, `map`, `prop`, `parseJSON`, `stringify`, `isEmail`, `isUrl`, `setIfValue`, `setNull`.
  - **JavaScript Expressions in `{{ }}`**: Evaluate JS expressions inline — `{{price * quantity}}`, `{{status === 'active' ? 'yes' : 'no'}}`, `` {{`Hello ${name}`}} ``. Sandboxed via Node.js `vm` module with 100ms timeout and safe built-ins only (Math, Date, JSON, String, etc.).
  - **String Concatenation**: `{{firstName + ' ' + lastName}}`, `{{baseUrl + '/api/' + version}}` — compose values inline.
  - **No-Input Filters**: `{{@ | btoa}}` generates a value from filters alone (no input variable needed).
  - **Variable References in Filter Args**: `{{price | add(tax)}}` looks up `tax` as an environment variable. Quoted args are always literals: `{{name | replace("old", "new")}}`.
  - **Nested Property Paths**: `{{response | prop("data.user.name")}}`, `{{users | map("address.city")}}`, `{{items | filter(meta.status=active)}}` — dot-notation traversal for `prop`, `map`, and `filter` filters.
  - **Environment Variables in Dynamic Variable Args**: `{{$randomInt(minValue, maxValue)}}` resolves `minValue` and `maxValue` from environment before generating the random integer.
  - **5-Step Resolution Pipeline**: Templates resolve in order: `$dynamic` variables → filter chains → variable lookup → JS expressions → original text. Applied consistently in both Request Tester and Script Executor.
- **Script Template Pre-Resolution**: `{{variable}}` templates now auto-resolve directly in pre-request and post-response script source code before execution — no need to wrap strings in `replaceIn()`. Filters, expressions, dynamic variables, and string concatenation all work inline. Postman-compatible: explicit `replaceIn()` calls remain safe (already-resolved strings are a no-op).
- **Monaco IntelliSense for Templates & Scripts**: Context-aware code completion in all Monaco editors (request body, GraphQL, pre-request, post-response).
  - **Template completions**: Type `{{` to see all environment, collection, and global variables with live values. Type `$` inside `{{ }}` for 18 dynamic variables. Type `|` for 30+ filter suggestions grouped by category (String, Math, Encoding, Hash, Array, Object, Validation) — filters with parameters include tab-stop snippets.
  - **Script API completions**: Type `hf.`, `pm.`, or `ctx.` in script editors to get full IntelliSense for the scripting API — variable scopes (`get`, `set`, `has`, `replaceIn`), request/response objects, cookies, test/expect assertions, `sendRequest`, and `info`. Deep chain support: `hf.response.to.have.status()`, `hf.request.headers.upsert()`, `expect().to.equal()`, etc.
- **OAuth 2.0 Authentication**: Full OAuth 2.0 support with all four grant types — now at feature parity with Postman for authentication.
  - **Authorization Code + PKCE**: Browser-based authorization via VS Code URI handler callback. PKCE S256 challenge enabled by default for security.
  - **Client Credentials**: Server-to-server token acquisition with automatic caching.
  - **Password (Resource Owner)**: Username/password grant for legacy systems.
  - **Implicit**: Browser-based token retrieval for SPAs and legacy clients.
- **Token Management**: Intelligent token lifecycle with in-memory caching, automatic expiry detection (30s buffer), and refresh token support. Tokens survive VS Code restarts via SecretStorage persistence.
- **OAuth2 Webview UI**: Full-featured form in the Authorization tab with:
  - Grant type selector with context-sensitive fields (auth URL, token URL, callback URL, PKCE toggle, username/password).
  - Advanced options panel: audience (Auth0), resource (Azure AD), token prefix, token field, client authentication mode (body vs header).
  - Token status area: Get New Token, Refresh Token, Clear Token buttons with token preview, expiry display, and error feedback.
- **Advanced OAuth2 Options**: `audience`, `resource`, `extraParams`, `callbackUrl`, `clientAuthentication` (body/header), `state`, `pkceMethod` (S256/plain) fields in `OAuth2Config` type and request schema.
- **OAuth2 Backend Services**: `OAuth2TokenManager` (singleton) with `IOAuth2TokenManager` interface, registered in DI container. `OAuth2Handler` message handler for webview communication. VS Code URI handler for `/oauth2/callback`.

### Fixed / Improved

- **GraphQL frontend argument completions**: Fixed `computeCompletionsLocally()` showing field completions (instead of argument completions) when the cursor is inside parentheses — e.g. `query { users(fi|` now correctly shows arguments of the `users` field instead of Query-level fields. Root cause: no parenthesis-depth tracking in the local completion path. Added `parenDepth` counter and `getArgumentCompletionsLocal()` helper that walks back to the field before `(`, resolves parent type, and returns the field's `args`.
- **GraphQL handler unused dependencies**: Removed unused `envConfigService` and `contextProvider` constructor parameters from `GraphQLHandler` — the handler only uses `IHttpClient` for schema introspection. Updated call site in `RequestTesterPanel` to pass only `httpClient`.
- **API Key field casing bug**: Fixed `rawAuth.apiKey` (camelCase) → `rawAuth.apikey` (lowercase) mismatch in `initializePanelData()` — API key config was silently lost when loading requests through the panel init path.
- **OAuth2 client_id leak in auth code flow**: Removed redundant `client_id` body parameter in authorization code token exchange — `applyClientAuth()` now handles all client credential placement to avoid rejection by strict OAuth2 servers (Auth0, Okta).
- **Stored refresh tokens recovered on restart**: `getToken()` now reads refresh tokens from SecretStorage when the in-memory cache is empty, avoiding unnecessary re-authentication after VS Code restarts.
- **clearAllTokens() clears SecretStorage**: Previously only cleared the in-memory cache, leaving orphaned refresh tokens in SecretStorage.
- **Snapshot dirty detection for all auth types**: `takeSnapshot()`/`hasChangedFrom()` now tracks `basicAuth`, `apiKey`, and `oauth2` state in addition to `authType`/`bearerToken`.
- **Concurrent auth flow protection**: Starting a new browser-based auth flow now properly rejects any pending previous flow instead of silently overwriting it.
- **Timeout cleanup**: Auth flow timeouts now clear the pending callback reference, preventing stale callbacks from interfering with subsequent flows.
- **OAuth2 state sync on form edits**: Every input/change event in the OAuth2 form now syncs `state.oauth2` via `getConfig()`, ensuring `buildAuth()` always reads fresh data for save and send operations.
- **Non-form OAuth2 fields preserved**: `getConfig()` spreads existing `state.oauth2` as a base before overlaying DOM values, so fields without form inputs (`callbackUrl`, `resource`, `extraParams`, `state`) survive round-trips.
- **Removed legacy `fetchOAuth2TokenLegacy`**: Dead code path eliminated — `OAuth2TokenManager` handles all grant types; `tokenManager` is now a required constructor parameter in `RequestPreparer`.


## 0.10.1 - 2026-03-01

### Added

- **Generate Example from editor content**: The "Generate Example" buttons on both Body Schema and Response Schema tabs now send the **current editor content** to the backend, so the generated example always matches what is visible in the schema tab — even if the user has edited the schema after loading. The backend falls back to collection/context lookup only when no editor content is provided.
- **Response Schema `$ref` support for examples**: Response schema `components` (shared `$ref` definitions) are now preserved separately when applying response schemas, ensuring `$ref`-heavy schemas resolve correctly during example generation.
- **Active status code for response example**: The "Generate Example" button on the Response Schema tab now sends the active status-code sub-tab to the backend, so the example is generated for the status code the user is currently viewing (e.g. 400, 500) rather than always defaulting to 200.

### Fixed / Improved

- **Generate Example not working**: Fixed a critical bug where clicking "Generate Example" on the Body Schema tab produced no output. Root cause: the backend's `findRequest()` returned the saved collection item (persisted before schemas were generated), so `bodySchema` was `undefined`. Now `findRequest()` backfills missing `bodySchema`/`responseSchema` from the in-memory context request when the collection item lacks them.
- **Generate Example not applied to body editor**: The `exampleBodyGenerated` message handler showed a status message but never called `setBodyValue()` to populate the body editor. Now the generated JSON is written into the body tab.
- **Generate Example blocked for ad-hoc requests**: The `if (!collectionId || !requestId)` guard on both generate-example buttons prevented them from working on unsaved/ad-hoc requests (e.g. requests opened from Spring API Tester). Guard removed.
- **Schema merge priority — saved wins consistently**: All fields in `mergeCollectionRequests()` now use saved-first priority (`saved.X ?? base.X`), including `responseSchema`, `bodySchema`, `deprecated`, and `description`. This preserves the user's manual edits; users can delete the saved request to pick up fresh base values.
- **Schema tab load priority**: `loadSchemas()` now applies in-memory `state.requestData.bodySchema`/`responseSchema` first and only falls back to a backend round-trip when no in-memory schemas exist, preventing stale persisted schemas from overwriting fresh data.

## 0.10.0 - 2026-02-26

### Added

- **OpenAPI Round-Trip**: Full OpenAPI 3.0.3 import and export support — all 6 phases of the [OPENAPI-SOLUTION.md](docs/OPENAPI-SOLUTION.md) are now complete.
  - **Import OpenAPI Spec**: Parse `.yaml`/`.json` OpenAPI 3.0 files into fully hydrated HTTP Forge collections with requests, body/response schemas, tag-based folder structure, and environment creation from server URLs. Supports `$ref` resolution via `@apidevtools/json-schema-ref-parser`.
  - **Export as OpenAPI**: Generate valid OpenAPI 3.0.3 YAML/JSON from collections — maps requests, auth, params, body formats, response schemas; deduplicates components; resolves server URLs from environments.
  - **New commands**: `Export as OpenAPI` (collection context menu), `Import OpenAPI Spec` (view title bar), `Infer Response Schema` (request context menu).
- **Schema Editor UI**: Two new tabs in the Request Tester — **Body Schema** and **Response Schema** — with Monaco editors for viewing and editing JSON Schema definitions.
  - **Body Schema toolbar**: "Infer from Body" (reads live editor content with variable resolution), "Generate Example", "Validate Body".
  - **Response Schema toolbar**: "Infer from History" (reads saved response history with correct environment/path resolution), "Capture Last Response", "Generate Example".
  - **Status code sub-tabs**: Response Schema tab shows per-status-code (200, 400, 404, etc.) sub-tabs with color-coded indicators (2xx green, 4xx amber, 5xx red).
- **Schema Inference Engine**: Automatic response/body schema generation from multiple sources.
  - `SchemaInferrer`: JSON Schema inference from sample values with recursive object/array handling, format detection (date-time, email, URI, UUID), nullable semantics.
  - `HistoryAnalyzer`: Groups saved `FullResponse` files by status code, infers schemas from response bodies, captures examples and consistent headers.
  - `ScriptAnalyzer`: Regex-based static analysis of post-response scripts to extract field paths, type hints, and expected status codes.
  - `SchemaInferenceService`: Orchestrates merge with priority: user-edited > history > script hints.
  - `ExampleGenerator`: Generates example JSON from schema definitions (allOf, oneOf, discriminators, enums, formats).
- **Inline metadata editing**: Params, headers, and query parameter rows include expandable metadata panels for editing `type`, `description`, `required`, `format`, `enum`, and `deprecated` — enabling OpenAPI-quality annotations directly in the UI.
- **Schema storage**: `response.schema.json` and `body.schema.json` sidecar files stored alongside each `request.json`. Extended `KeyValueEntry` type with optional metadata fields.

### Fixed / Improved

- **Schema dirty detection**: Body Schema and Response Schema editor changes now properly enable the Save button. Metadata changes (params, headers, query) also tracked in save snapshot.
- **Live body data for inference**: "Infer from Body" and "Validate Body" read the current editor content (with `sentRequest` body as highest priority when variables are resolved) instead of the stale saved collection body.
- **Variable placeholder resolution**: `{{variable}}` placeholders in JSON body are resolved to dummy values before parsing for schema inference, preventing "Could not infer schema" errors.
- **History path resolution**: "Infer from History" now uses `contextProvider.getHistoryStoragePath()` to get the correct `requestPath` (including folder path) and active `environment`, fixing empty schema results when history was stored under a different path/environment.
- **Capture response status**: "Capture Last Response" correctly reads `response.status` (not `statusCode`) from the last response object.

## 0.9.14 - 2026-02-18

### Added

- **Response HTML preview**: rendered HTML preview in the Response → Body panel with a Raw / Preview toggle (sandboxed iframe). Preview is prepared as soon as an HTML response arrives and the toolbar is shown when the Body tab is active.

### Fixed / Improved

- **Error rendering**: execution/network errors are returned as formatted HTML so the Response tab displays readable error messages (includes stack when available); scrollbars inside the preview are styled for better contrast with the editor theme.
- **Documentation**: updated Request Tester user guide and design docs to document the HTML preview, toolbar behaviour and detection heuristic.

## 0.9.13 - 2026-02-13

### Fixed

- **New Request — allowDuplicatedName**: fixed handling when `allowDuplicatedName` is enabled so creating requests with duplicate names behaves correctly.
- **Save Request (body persistence)**: fixed a bug where the request body was not being saved to disk when persisting a request; body content is now persisted correctly.

## 0.9.12 - 2026-02-12

### Fixed
 - **Shared History Full-Response**: fixed sharing/restore of full-response files — `{entryId}.json` is preserved when sharing and correctly loaded when restoring a shared entry.

## 0.9.11 - 2026-02-12

### Fixed

- **Shared History Deletion**: fixed an issue where deleting shared history entries would not always remove the item from disk or the UI.
- **Shared History Populate/Restore**: fixed populate/restore bug so shared history entries correctly populate the Request Tester form when restored.

## 0.9.10 - 2026-02-11

### Added

- Mustache template highlighting in request body and GraphQL variables editors. Full expressions (including sections, inverse sections, comments, partials and unescaped/triple-stache) are highlighted as an overlay so Monaco's native syntax rules remain intact.
- Per-request percentile statistics (p50, p90, p95, p99) are now computed per run and stored in each request's entry in the run manifest (visible in the Test Suite UI).

## 0.9.7 - 2026-02-05

### Changed

- **Header Normalization**: All HTTP header keys are now automatically converted to uppercase during request execution for improved consistency and compatibility.
- fixed cookie issue, Honor header cookie
- fixed new request issue

## 0.9.6 - 2026-02-05

### Changed

- **Canonical Auth Structure**: Standardized all authentication handling (Basic, Bearer, API Key) to use a canonical nested structure across backend, loader, and test suite logic.
- **Test Suite & Loader**: Updated test suite runner and loader logic to use canonical auth fields, ensuring consistent authentication in all flows.
- **Postman Export Compatibility**:
  - `mapBody` now supports all Postman body modes and uses a `format` property for raw bodies.
  - `mapUrl` now exports the full Postman URL object, including `raw`, `host`, `path`, `query` (with `disabled`), and `variable` fields, matching the v2.1 schema.
  - Query parameters in exported Postman collections now include the `disabled` property if present.
- **Directory Diff Tooling**: Added/used tooling to compare collection directories for content differences, ignoring IDs and excluded files, to ensure export/import fidelity.

## 0.9.5 - 2026-02-04

### Fixed

- **Test Suite Authentication**: Fixed 401 errors when running test suites with authenticated requests. Auth configuration (Basic, Bearer, API Key) now properly passed to request executor.
- **Test Suite Pass/Fail Logic**: When assertions are defined, pass/fail is now determined by assertion results only. Previously, requests with expected error status codes (e.g., 404) were incorrectly marked as failed.
- **Test Suite Empty State**: Fixed "No results yet" message still showing while results were being added.
- **Request Tester Scrolling**: Fixed double scrollbar issues in Scripts tab and Response sections.
- **Request Tester Tests Tab**: Fixed test results bleeding into Sent Request tab due to CSS specificity issue.
- **Request Tester Test Clearing**: Test results now properly clear when switching to a different request.

### Changed

- **Virtual Scroll Height**: Test suite results now use actual container height instead of hardcoded 400px for better responsive layout.

---

## 0.9.4 - 2026-02-01

### Changed

- **Webview SOLID Refactoring**: Request Tester webview completely refactored into modular architecture
  - `main.js` - Entry point, initialization, event binding
  - `message-handler.js` - Handle messages from extension
  - `state.js` - Application state management
  - `elements.js` - Centralized DOM element references
  - `request-builder.js` - Build request configuration from UI
  - `request-executor.js` - Execute requests via extension
  - `request-loader.js` - Load request data into UI form
  - `request-saver.js` - Save request to collection
  - `response-handler.js` - Process and display responses
  - `url-builder.js` - Build URL with variable substitution
  - `form-manager.js` - Manage form inputs
  - `query-params-manager.js` - Manage query parameters table
  - `path-variables-manager.js` - Manage path variables
  - `body-type-manager.js` - Manage request body type selection
  - `monaco-editors-manager.js` - Monaco editor instances
  - `history-renderer.js` - Render request history
  - `cookie-manager.js` - Manage cookies
  - `script-runner.js` - Execute pre/post scripts
  - `agl-object.js` - Script API object (`forge`)
  - `expect-chain.js` - Fluent assertion API
  - `test-results.js` - Test results management
  - `console-capture.js` - Capture console output

### Technical Notes

- Each module now has a single responsibility (SRP)
- Modules are loosely coupled through message passing
- State management centralized in `state.js`
- DOM references centralized in `elements.js`

---

## 0.9.3 - 2026-01-28

  - Support for all HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)
  - Query parameters with enable/disable toggle
  - Custom headers with enable/disable toggle
  - Path variables with `{{variableName}}` syntax
  - Pre-request scripts for request preparation
  - Post-response scripts for response processing
  - Configurable timeout (0 = no timeout)
  - SSL certificate verification toggle
  - Follow redirects with configurable options

- **Collections Management**
  - Create, rename, and delete collections
  - Organize requests in nested folders
  - Import Postman collections (v2.1 format)
  - Export collections to Postman-compatible format
  - Tree view with icons for HTTP methods

- **Environment Management**
  - Multiple environments support (dev, staging, prod, etc.)
  - Variable substitution (`{{variableName}}`) in URL, headers, body
  - Environment inheritance for shared variables
  - Local secrets file support (gitignored)
  - Environment variable overrides (persisted to workspace state)
  - Quick environment switching from status bar

- **Response Viewer**
  - Syntax-highlighted response body (JSON, XML, HTML)
  - Response headers table view
  - Cookies table with domain info
  - Response metrics (time, size, status)
  - Color-coded status badges (green 2xx, orange 4xx, red 5xx)
  - Copy response to clipboard

- **Request History**
  - Automatic history saving per request
  - History grouped by context (ticket/branch)
  - Collapsible groups with chevron toggle
  - Resizable sidebar (180px - 500px)
  - Active entry highlighting
  - Duration with comma formatting (e.g., `11,234ms`)
  - Color-coded duration (green <1s, orange 1-5s, red >5s)
  - Delete individual history entries
  - Re-execute past requests with one click

- **Cookie Management**
  - Automatic cookie handling across requests
  - Domain-aware cookie storage
  - Cookie persistence across requests
  - View cookies in response panel

- **Test Suite** (replaces Collection Runner)
  - Select requests from multiple collections
  - Save test configurations for reuse
  - Run selected requests with iterations
  - Configurable delay between requests
  - Performance statistics (P50/P90/P95/P99)
  - Error rate and error breakdown
  - Real-time progress display
  - Detailed results with virtual scrolling

- **Extension API**
  - Public API for VS Code extension integration
  - Execute requests programmatically
  - Access environments and collections
  - Open request tester from external extensions
  - Full TypeScript type definitions

### Technical Notes

- Extracted from AGL Essentials extension for broader audience
- Built with TypeScript and esbuild
- Uses VS Code Webview API for panels
- Storage in workspace `.http-forge` folder
- Supports VS Code 1.99.3+
- Independent VS Code extension
- TypeScript with esbuild bundling
