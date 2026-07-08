# MCP Server

HTTP Forge can expose your collections and test suites as an **MCP (Model Context Protocol) server**, letting AI agents (Claude, GitHub Copilot, and others) discover and execute your API requests directly.

## How it works

When the MCP server is running, AI agents see every request in your collections and every test suite as a callable tool. They always reflect the current state — no re-export needed when you change a collection.

```
AI Agent
  → POST http://localhost:3100      (or POST http://localhost:3100/mcp)
  → HTTP Forge executes the request using your saved config
  → Returns structured result (status, body, assertions, report URI)
```

> Both `POST /` and `POST /mcp` accept the same JSON-RPC 2.0 payload.
> Use whichever path your MCP client requires.

---

## Starting the server

### Option 1 — Command Palette

Press `Ctrl+Shift+P` and run:

```
HTTP Forge: Start MCP Server
```

### Option 2 — Status Bar

Click the **`⊙ MCP ○`** icon in the bottom-right status bar to toggle the server on/off.  
When running it shows: **`⊙ MCP ● 3100`**

### Option 3 — Auto-start on activation

Add to your VS Code `settings.json`:

```json
{
  "httpForge.mcpServer.autoStart": true
}
```

Set server port in `http-forge.config.json` (project-shared, default `3100`):

```json
{
  "mcp": {
    "port": 3100
  }
}
```

---

## Connecting an AI client

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "http-forge": {
      "url": "http://localhost:3100/mcp"
    }
  }
}
```

### GitHub Copilot / VS Code

Create `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "http-forge": {
      "type": "http",
      "url": "http://localhost:3100"
    }
  }
}
```

---

## What the AI can do

Once connected, the AI automatically discovers all tools. In the default **flat** mode there is one tool per request, folder, collection, and suite:

| Tool name pattern | What it does |
|---|---|
| `request__<colId>__<reqId>` | Execute a single saved request |
| `folder__<colId>__<path>` | Run all requests in a folder (recursive by default) |
| `collection__<colId>` | Run all requests in a collection sequentially |
| `suite__<suiteId>` | Run a test suite (with full script and assertion support) |

> For very large workspaces you can switch to **drill-down** mode, which exposes a small fixed set of generic tools instead. See [Tool modes — flat vs drill-down](#tool-modes--flat-vs-drill-down).

---

## Tool modes — flat vs drill-down

How collections and requests appear as MCP tools is controlled by `mcp.toolMode` in `http-forge.config.json` (default `"auto"`).

| Mode | What the AI sees | Best for |
|---|---|---|
| `auto` (default) | `flat` below `drilldownThreshold` (100), then switches to `drilldown` | **All workspaces** — adapts automatically |
| `drilldown` | A small fixed set of generic tools whose **arguments** select the target | Very large workspaces or context-constrained AI clients |
| `flat` | One tool per request, folder, collection, and suite | Tiny, stable collections (<100 requests). **Avoid for large workspaces** — bloats AI context |

### Why drill-down exists

In `flat` mode every request becomes its own tool. With thousands of requests across many collections, the `tools/list` response becomes very large — which bloats the model's context, slows tool selection, and can hit provider tool-count limits. Drill-down keeps the tool list tiny and constant no matter how many requests you have.

### The generic tools (drill-down mode)

#### Inspection

| Tool | Key arguments | What it does |
|---|---|---|
| `list_collections` | — | List every collection (name, id, description, request count) |
| `list_folders` | `collection` | List all folder paths in a collection |
| `list_requests` | `collection`, optional `folder`, `offset`, `limit` | Paginated request list (name, method, folder, id) |
| `search_requests` | `collection`, `query` | Full-text search across name, URL, method, folder, description |
| `get_request` | `collection`, `request` | Get full request detail: URL, method, headers, body, auth, scripts |

#### Execution

| Tool | Key arguments | What it does |
|---|---|---|
| `run_request` | `collection`, `request` or `requestId`, + overrides | Run one request |
| `run_folder` | `collection`, `folder`, + run options | Run every request in a folder |
| `run_collection` | `collection`, + run options | Run an entire collection |
| `run_suite` | `suite`, + run options | Run a test suite |

#### Async run polling

| Tool | Key arguments | What it does |
|---|---|---|
| `get_run_status` | `runId` | Poll a background run's live status and progress |
| `get_run_summary` | `runId` | Fetch the final summary once a run completes |
| `get_failed_requests` | `runId`, `offset`, `limit` | Page through failed requests from a completed run |
| `get_request_result` | `runId`, `request`, `iteration` | Get one request's full result from a completed run |
| `cancel_run` | `runId` | Best-effort cancellation — skips remaining requests; in-flight request still completes |

#### Environment & variables

| Tool | Key arguments | What it does |
|---|---|---|
| `get_environment` | optional `environment` | Resolve all variables for an environment |
| `get_environment_variables` | optional `environment` | Show file variables, session overrides, and resolved values |
| `list_environments` | — | List all environments (name, active state, variable keys) |
| `select_environment` | `environment` | Switch the active environment |
| `create_environment` | `name`, optional `variables` | Create a new environment with optional initial variables |
| `delete_environment` | `environment`, `confirm: true` | Delete an environment |
| `set_variable` | `key`, `value`, optional `environment` | Set an environment variable for the current session |
| `set_environment_variable` | `key`, `value`, optional `environment`, `scope` | Set a variable (`scope: "session"` or `"permanent"` — permanent writes the env file) |
| `unset_environment_variable` | `key`, optional `environment` | Remove a variable override |
| `set_global_variable` | `key`, `value`, `scope` | Set a global variable (`"session"` = in-memory; `"permanent"` = writes `_global.json`) |
| `get_globals` | — | List all global variables |

#### Collection management

| Tool | Key arguments | What it does |
|---|---|---|
| `create_collection` | `name` | Create a new empty collection |
| `rename_collection` | `collection`, `newName` | Rename a collection |
| `delete_collection` | `collection`, `confirm: true` | Delete a collection and all its requests |
| `duplicate_collection` | `collection`, `newName` | Copy a collection under a new name |
| `create_folder` | `collection`, `name`, optional `parentFolder` | Create a folder (optionally nested) |
| `delete_folder` | `collection`, `folder`, `confirm: true` | Delete a folder and all requests inside it |
| `create_request` | `collection`, `name`, `url`, optional `method`, `folder`, `body`, `description` | Create a new request |
| `update_request` | `collection`, `request`, any of `name`, `method`, `url`, `headers`, `body`, `description` | Edit an existing request |
| `delete_request` | `collection`, `request`, `confirm: true` | Delete a request |
| `get_request_script` | `collection`, `request`, `phase` | Read a pre-request or post-response script |
| `set_request_script` | `collection`, `request`, `phase`, `script` | Write a pre-request or post-response script |
| `reorder_collection_items` | `collection`, `order`, optional `folder` | Reorder requests/folders inside a collection or folder |

#### AI analysis & enhancement

| Tool | Key arguments | What it does |
|---|---|---|
| `ai_suggest_env_vars` | `collection` | **Agentic** — scan for hardcoded values; AI calls `apply_env_vars` immediately |
| `ai_enhance_collection` | `collection`, optional `offset` | **Agentic** — AI writes bodies + `pm.test()` scripts; calls `apply_request_enhancements`; self-continues |
| `suggest_env_vars` | `collection` | Heuristic env var suggestions for manual review |
| `apply_env_vars` | `collection`, `replacements`, optional `environment` | Replace hardcoded values with `{{VAR}}` placeholders; write originals to env |
| `get_requests_for_enhancement` | `collection`, optional `offset`, `limit` | Paginated request details for LLM enhancement |
| `apply_request_enhancements` | `collection`, `enhancements` | Write AI-generated bodies and `pm.test()` scripts back to requests |
| `analyze_coverage` | `collection`, optional `specPath`, `folder` | Per-request assertion count + collection-level %. Optional spec comparison surfaces untested operations. No LLM. |
| `ai_analyze_coverage` | `collection`, optional `specPath` | **Agentic** — returns coverage gaps; AI calls `ai_enhance_collection` for unasserted requests and `generate_scenarios` for untested operations |
| `generate_request_from_intent` | `collection`, `intent`, optional `folder` | **Agentic** — plain-English intent → AI calls `create_request` + `set_request_script` in one shot |
| `validate_against_spec` | `collection`, `specPath` | Deterministic spec drift: untested operations, matched-but-unasserted requests, requests not in spec |
| `generate_scenarios` | `collection`, optional `request`, `folder`, `offset` | **Agentic** — AI generates negative/edge-case variants (400/401/403/404/boundary) and calls `create_request` + `set_request_script` |
| `heal_assertions` | `collection`, `request`, optional `runId` | **Agentic** — AI rewrites stale test script to match observed response; calls `set_request_script` |
| `generate_iteration_data` | `collection`, `request`, optional `iterations` | **Agentic** — AI produces N varied test data rows (happy-path/boundary/invalid/edge) as a JSON array |

#### Suite management

| Tool | Key arguments | What it does |
|---|---|---|
| `list_suites` | — | List all test suites |
| `get_suite` | `suite` | Get full suite details including request list and config |
| `create_suite` | `name`, optional `fromCollection`, `fromFolder`, `iterations`, `stopOnError`, `delayBetweenRequests` | Create a suite, optionally from a collection |
| `update_suite_config` | `suite`, any of `name`, `description`, `iterations`, `stopOnError`, `delayBetweenRequests` | Edit suite metadata and run config |
| `add_suite_requests` | `suite`, `requests` (array of `{collection, request}`), optional `insertAt` | Add requests to a suite |
| `remove_suite_request` | `suite`, `request` name or `index` | Remove one request from a suite |
| `reorder_suite_requests` | `suite`, `order` (array of names) | Reorder requests inside a suite |
| `duplicate_suite` | `suite`, `newName` | Copy a suite under a new name |
| `delete_suite` | `suite`, `confirm: true` | Delete a suite |

Collection and suite **names are advertised as JSON-schema `enum`s**, so the AI chooses from real values instead of guessing. The typical flow mirrors how you'd think about it: the agent calls `list_collections` → picks one → `list_requests` to find the exact request → `run_request`. The override arguments (`environment`, `variables`, `headers`, `iterations`, `include`, …) are identical to flat mode.

### Enabling it

```json
{
  "mcp": {
    "toolMode": "auto",
    "drilldownThreshold": 100
  }
}
```

Use `"drilldown"` to always use the generic toolset regardless of size. Use `"flat"` only for small, stable collections — it logs a warning when the workspace exceeds 500 requests.

---

## Example prompts and scenarios

### 1. Run a single request as-is

> "Run the GET /api/users request from the MyApp collection"

> "Call the health-check request using the production environment"

The AI picks up your saved URL, headers, auth, and environment variables automatically.

---

### 2. Override request parameters at call time

You can ask the AI to change any part of a saved request without modifying the collection.

**Override the environment:**
> "Run the POST /api/login request using the staging environment instead of dev"

**Inject extra variables (resolved as `{{variable}}` in URL, headers, body):**
> "Call GET /api/orders using userId = 42"

The AI passes `{ variables: { userId: "42" } }` — your saved request uses `{{userId}}` which gets resolved at runtime.

**Override headers:**
> "Run GET /api/reports but add the header X-Tenant: acme-corp"

**Override query parameters:**
> "Call GET /api/products with query params category=electronics and limit=5"

**Replace the request body entirely:**
> "POST to /api/users with body `{ \"name\": \"Alice\", \"role\": \"admin\" }`"

**Combine multiple overrides:**
> "Run POST /api/orders on staging, set the Authorization header to Bearer abc123, and use body `{ \"productId\": \"99\", \"qty\": 2 }`"

---

### 3. Inspect response details

By default the AI only sees `status`, `ok`, `body`, and test results. Ask for more when you need it:

**See response headers:**
> "Call GET /api/token and show me the response headers"

**See test assertion results:**
> "Run POST /auth/login and show me the full test results"

**See console output from scripts:**
> "Run the auth flow and include the script console output so I can debug"

---

### 4. Run an entire collection

**Basic run:**
> "Run the entire Auth Flow collection and tell me if everything passed"

> "Run the MyApp collection on staging and stop on the first failure"

> "Run the Data Migration collection and show me the result of each request"

**Multiple iterations for stability testing:**
> "Run the Payment collection 5 times and tell me if it's stable"

> "Run the Checkout flow on production 10 times and report the failure rate"

---

### 5. Run a folder within a collection

Every folder in every collection is exposed as its own tool (`folder__<collectionId>__<path>`), so the AI can run just part of a collection. Folder runs are **recursive by default** (they include nested subfolders); ask to exclude subfolders to scope to that level only.

**Basic run:**
> "Run the Auth/Login folder in the MyApp collection and tell me if everything passed"

> "Run just the Users folder from the API collection on staging"

**Only the folder's own requests (no subfolders):**
> "Run only the requests directly in the Checkout folder — skip its subfolders"

**Multiple iterations:**
> "Run the Payments/Refunds folder 5 times and report the failure rate"

---

### 6. Run a test suite

**Basic run:**
> "Run the Regression suite and summarize the results"

**Override iterations for stability testing:**
> "Run the Auth Suite 10 times and tell me the failure rate"

**Filter to specific requests:**
> "Run only the login and profile requests from the Full Regression suite"

**Get full details on failures:**
> "Run the Smoke Test suite and show me the full response body for every failed request"

**Combine options:**
> "Run the Order Flow suite on production, 3 iterations, stop on first error, and show me failures in detail"

---

### 7. Chain requests — use output from one as input to the next

This is the most powerful pattern. Your existing post-response scripts set variables automatically (via `pm.environment.set()`), and the AI passes them to the next call.

**Simple auth + use token:**
> "Login using the POST /auth/login request, then use the token to call GET /api/profile"

The AI will:
1. Call `POST /auth/login` → receives `modifiedVariables: { accessToken: "eyJ..." }`
2. Call `GET /api/profile` with `{ variables: { accessToken: "eyJ..." } }`

**Multi-step workflow:**
> "Create a new order, then use the returned order ID to fetch its details, then delete it"

**Debug a failing flow:**
> "Run the full checkout flow step by step — login, add to cart, place order — and show me where it fails"

---

### 8. Compare environments

> "Run GET /api/config on dev and staging and tell me if the responses are different"

The AI calls the same request twice with different environments and compares the results.

---

### 9. Validate after deployment

> "Run the Smoke Test suite on production and tell me if I'm safe to proceed"

> "Run all requests in the Health Check collection and confirm everything returns 200"

---

### 10. Build a regression suite from a collection (QA)

A QA engineer can ask the AI to create a test suite directly from an existing collection, with no JSON editing required.

> "Create a regression suite called 'Checkout Regression' from the Payments collection"

> "Create a suite from the Auth folder in the MyApp collection, run it 3 times, and stop on the first error"

> "Build a smoke test suite from all requests in the Orders collection — only include the ones in the 'Happy Path' folder"

The AI calls `list_collections`, `create_suite(fromCollection: "Payments", name: "Checkout Regression")` and then optionally configures iterations and `stopOnError` with `update_suite_config`.

---

### 11. Manage a test suite (QA)

Once a suite exists, the AI can add, remove, and reorder requests without touching any files.

**Add requests:**
> "Add the POST /api/orders and GET /api/orders/{id} requests from the Orders collection to the Checkout Regression suite"

> "Append the DELETE /api/cart request from the Cart collection to the Checkout suite"

**Remove a request:**
> "Remove the 'Seed test data' request from the Smoke Test suite — it's no longer needed"

> "Delete the request at position 3 in the Full Regression suite"

**Reorder:**
> "Move the login request to the top of the Checkout Regression suite, then place 'Create order' second"

**Update config:**
> "Set the Checkout Regression suite to run 5 iterations with a 200ms delay between requests"

> "Enable stop-on-error for the Smoke Test suite"

**Duplicate:**
> "Duplicate the Checkout Regression suite as 'Checkout Regression — Staging' so I can tune it for staging without touching the original"

---

### 12. Set up environments for a run (QA)

> "List all environments and tell me which one is currently active"

> "Switch to the staging environment before running the suite"

> "Set auth_token to 'Bearer eyJ...' in the staging environment for this session, then run the Auth Regression suite"

> "Show me all the variables in the production environment — I need to know what's configured before I run"

> "Create a new environment called 'SIT' and set base_url to https://sit.example.com, auth_token to abc123"

The AI uses `list_environments`, `select_environment`, `set_environment_variable` (session scope), and `create_environment` — no JSON file editing required.

---

### 13. Investigate a failed run (QA)

> "Run the Full Regression suite asynchronously, then check in on progress every minute"

The AI starts the run with `async: true` (gets back a `runId`), then polls `get_run_status` and finally calls `get_run_summary`. When failures are present, `get_run_summary` returns `failedRequests` inline — the AI diagnoses them automatically without any extra prompting (see [AI auto-diagnosis](#ai-auto-diagnosis)).

> "Show me the first 10 failures from run abc-123"

> "Get the full response body for the 'POST /api/orders' request from run abc-123, iteration 2"

---

### 14. Build a collection from scratch (Developer)

A developer can ask the AI to scaffold a whole collection with folders and requests without writing a single JSON file.

> "Create a new collection called 'Payments API v3'"

> "Add a 'Checkout' folder to the Payments API v3 collection"

> "Create a POST request called 'Create Order' in the Checkout folder of Payments API v3, URL {{base_url}}/orders, body `{\"productId\": \"{{productId}}\", \"qty\": 1}`"

> "Add a GET request 'Get Order' at {{base_url}}/orders/{{orderId}} to the Checkout folder"

> "Create a DELETE request 'Cancel Order' at {{base_url}}/orders/{{orderId}} in Checkout with a description 'Cancels an order by id'"

The AI chains `create_collection` → `create_folder` → multiple `create_request` calls, building the collection incrementally.

---

### 15. Edit and organise existing requests (Developer)

> "Rename the 'Create Order v1' request in the Payments collection to 'Create Order'"

> "Update the URL of 'Get Order' in Payments to {{base_url}}/v2/orders/{{orderId}}"

> "Add a Content-Type: application/json header to all POST requests in the Checkout folder" *(AI iterates via `list_requests` + `update_request`)*

> "Move the 'Health Check' request to the top of the MyApp collection"

> "Reorder the requests in the Checkout folder: Login first, then Create Order, then Get Order, then Cancel Order"

---

### 16. Write pre-request and post-response scripts (Developer)

> "Add a pre-request script to 'Create Order' in Payments that sets `pm.environment.set('orderId', pm.variables.replaceIn('{{$uuid}}'))`"

> "Add a post-response script to 'Login' in Auth that extracts the access token: `pm.environment.set('accessToken', pm.response.json().token)`"

> "Show me the post-response script on the 'Login' request in the Auth collection"

> "Remove the pre-request script from 'Seed Data' in the Fixtures collection — replace it with an empty string"

The AI uses `get_request_script` to read, `set_request_script` to write, and never touches the filesystem directly.

---

### 17. Duplicate and refactor a collection (Developer)

> "Duplicate the Payments API collection as 'Payments API v3 — Draft' so I can work on the new version without breaking the existing suite"

> "Rename the duplicate to 'Payments API v3'"

> "Delete the 'Legacy Endpoints' folder from Payments API v3 — confirm deletion"

> "Duplicate the Checkout Regression suite as 'Checkout Regression v3' and update it to point at the new collection requests"

---

### 18. Manage global variables (Developer)

> "Set a global variable 'api_version' to 'v3' permanently so all collections pick it up"

> "Show me all current global variables"

> "Set global 'feature_flag_new_checkout' to 'true' for this session only"

Global session variables reset when the server restarts; permanent ones are written to `_global.json` and survive restarts.

---

## Argument reference

### Single request arguments

| Argument | Type | Description |
|---|---|---|
| `environment` | string | Environment name (defaults to currently selected) |
| `variables` | object | Extra `{{variable}}` values to inject |
| `headers` | object | Override or add request headers |
| `query` | object | Override query parameters |
| `body` | string | Replace the request body (JSON string) |
| `include` | array | Extra fields in response: `headers`, `cookies`, `tests`, `consoleOutput` |

### Collection arguments

| Argument | Type | Description |
|---|---|---|
| `environment` | string | Environment name (defaults to currently selected) |
| `iterations` | number | Run the collection multiple times (e.g. for stability testing) |
| `stopOnError` | boolean | Stop on the first failed request |
| `delay` | number | Delay between requests (ms) |
| `variables` | object | Inject variables into every request |
| `headers` | object | Override headers on every request |
| `requestFilter` | string[] | Run only requests whose names contain one of these strings |
| `include` | array | `perRequest` (per-request details), `failedOnly` (failed request details), `consoleOutput` (script console output per request), `report` (force report metadata in response) |

### Test suite arguments

| Argument | Type | Description |
|---|---|---|
| `environment` | string | Environment name |
| `iterations` | number | Override the suite's default iteration count |
| `stopOnError` | boolean | Stop on first failure |
| `delay` | number | Delay between requests (ms) |
| `variables` | object | Inject variables into every request |
| `requestFilter` | string[] | Run only requests whose names contain one of these strings |
| `include` | array | `perRequest` (per-request details), `failedOnly` (failed request details), `consoleOutput` (script console output per request), `report` (force report metadata in response) |

---

## Response format

### Single request result (default)

```json
{
  "status": 200,
  "ok": true,
  "duration": "142ms",
  "body": { "token": "eyJhbGc...", "expiresIn": 3600 }
}
```

When tests fail:

```json
{
  "status": 500,
  "ok": false,
  "duration": "89ms",
  "body": { "error": "Internal Server Error" },
  "allPassed": false,
  "failedTests": ["Status is 200", "Has token"]
}
```

When a pre-request script sets a variable (`pm.environment.set('token', ...)`), it is returned as `modifiedVariables` so the AI can pass it to the next call:

```json
{
  "status": 200,
  "ok": true,
  "body": { "token": "eyJhbGc..." },
  "modifiedVariables": { "accessToken": "eyJhbGc..." }
}
```

### Collection result (default — summary only)

```json
{
  "collection": "Auth Flow",
  "environment": "dev",
  "summary": {
    "total": 10,
    "passed": 10,
    "failed": 0,
    "allPassed": true
  }
}
```

When running with multiple iterations:

```json
{
  "collection": "Auth Flow",
  "environment": "dev",
  "summary": {
    "total": 30,
    "passed": 30,
    "failed": 0,
    "iterations": 3,
    "allPassed": true
  }
}
```

### Test suite result (default — summary only)

```json
{
  "suite": "Regression - Auth Flow",
  "environment": "dev",
  "summary": {
    "total": 10,
    "passed": 9,
    "failed": 1,
    "iterations": 1,
    "allPassed": false
  },
  "failedRequests": [
    {
      "name": "POST /api/orders",
      "status": 500,
      "duration": "412ms",
      "body": { "error": "NullPointerException" },
      "failedTests": [{ "name": "Status is 201" }]
    }
  ],
  "report": {
    "uri": "http://localhost:3100/report?path=%2Fpath%2Fto%2F.http-forge-cache%2Fresults%2Fsuite-id%2Frun-id%2Freport.html",
    "hint": "Click the URI to open the HTML report in your browser"
  }
}
```

---

## HTML Test Reports

After every collection or test suite run — whether triggered by AI or from the VS Code UI — HTTP Forge automatically generates a self-contained **HTML report** alongside the JSON result files.

The report includes:
- Summary cards (total, passed, failed, duration)
- Per-request statistics table with P90/P99 percentiles
- Request timeline with duration bars
- Expandable failure details with request/response bodies and assertion results

The report URI is returned in the MCP tool response as `report.uri` (an HTTP URL served by HTTP Forge at `/report?path=...`). AI clients render this as a clickable link. In the VS Code test suite panel, the **Export HTML** button opens the same report in your system browser.

Reports are stored under `.http-forge-cache/results/` in your workspace:

```
.http-forge-cache/results/
└── <suiteId>/
    ├── run-20260616-120841-388/
    │   ├── manifest.json
    │   ├── report.html
    │   ├── index/
    │   └── results/
    └── run-20260616-124009-795/
        └── ...
```

Collection runs use `temp-<collectionId>` as the suite directory, so all runs of the same collection accumulate in one place.

---

## Chain requests with variables

The most powerful use case: AI executes a login request, extracts the token via script, then passes it automatically to subsequent requests.

```
Step 1 — AI calls: request__auth__login  {}
← { ok: true, modifiedVariables: { accessToken: "eyJ..." } }

Step 2 — AI calls: request__users__list  { variables: { accessToken: "eyJ..." } }
← { ok: true, body: { users: [...] } }
```

The `modifiedVariables` are set by your existing pre-request / post-response scripts (`pm.environment.set()`), so no changes to your collection are needed.

---

## Verify the server is running

```bash
# Health check
curl http://localhost:3100/health

# List all available tools
curl -X POST http://localhost:3100 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

---

## AI-native generation tools

In addition to the run/list/create/manage tools, the MCP server exposes tools specifically designed for AI-assisted test authoring, debugging, and collection management. Your agent (Copilot, Claude, etc.) does the reasoning; these tools provide the grounding data.

### Agentic AI tools — env scanning and collection enhancement

These two tools follow the **agentic pattern**: each tool returns both raw data *and* a `task.instructions` array telling the calling AI exactly what to do next — which tool to call, with which arguments. The AI executes the workflow in a self-continuing loop. **No external LLM API keys are required on the server side.**

#### `ai_suggest_env_vars`

Scan a collection for hardcoded values (API keys, Bearer tokens, base URLs, tenant IDs) and replace them with `{{ENV_VAR}}` placeholders. The tool returns the full request data so the calling AI can decide which values to replace; the AI then calls `apply_env_vars` with the results.

**Example agent prompt:** *"Find all hardcoded credentials in my 'Payments API' collection and replace them with env vars."*

```
Agent calls: ai_suggest_env_vars({ "collection": "payments-api" })
→ {
    task: {
      action: "ai_suggest_env_vars",
      instructions: [
        "Review the requestSummary and heuristicSuggestions below.",
        "Identify ALL hardcoded values (API keys, tokens, base URLs, IDs, etc.)",
        "Call apply_env_vars with your complete list of {value, varName} replacements",
        "Do NOT ask for confirmation — proceed immediately"
      ],
      heuristicSuggestions: [...],
      requestSummary: [...],
      expectedCallAfterThis: "apply_env_vars"
    }
  }

Agent immediately calls: apply_env_vars({
  "collection": "payments-api",
  "replacements": [
    { "value": "Bearer sk-prod-abc123", "varName": "PAYMENTS_API_KEY" },
    { "value": "https://api.payments.example.com", "varName": "PAYMENTS_BASE_URL" }
  ],
  "environment": "dev"
})
→ { replaced: 14, envVarsWritten: 2 }
```

**Inputs:** `collection` (required), optional `environment`

---

#### `ai_enhance_collection`

Enhance every request in a collection with AI-written example request bodies and `pm.test()` assertion scripts. The tool paginates through requests in batches and tells the calling AI to write enhancements for each batch, then call `apply_request_enhancements`. The AI continues until `hasMore` is false.

**Example agent prompt:** *"Add realistic example bodies and test assertions to all requests in the 'User Service' collection."*

```
Agent calls: ai_enhance_collection({ "collection": "user-service" })
→ {
    task: {
      action: "ai_enhance_collection",
      instructions: [
        "Write a realistic example body and pm.test() assertions for each request below.",
        "Call apply_request_enhancements with your enhancements.",
        "If hasMore is true, call ai_enhance_collection again with nextOffset.",
        "Do NOT ask for confirmation — proceed immediately."
      ],
      requests: [ { id, name, method, url, currentBody, currentTestScript }, ... ],
      total: 42, offset: 0, hasMore: true, nextOffset: 10,
      expectedCallAfterThis: "apply_request_enhancements"
    }
  }

Agent calls: apply_request_enhancements({
  "collection": "user-service",
  "enhancements": [
    {
      "requestId": "...",
      "body": "{ \"username\": \"alice\", \"email\": \"alice@example.com\" }",
      "testScript": "pm.test('Status 201', () => pm.response.to.have.status(201));\npm.test('Has userId', () => pm.expect(pm.response.json().userId).to.be.a('string'));"
    },
    ...
  ]
})
→ { applied: 10 }

Agent then calls: ai_enhance_collection({ "collection": "user-service", "offset": 10 })
→ ... (repeats until hasMore: false)
```

**Inputs:** `collection` (required), optional `offset` (default: 0)

---

### Data tools — env vars (read → AI analyzes → write)

Use these when you want to control the AI analysis step manually or inspect intermediate data.

#### `suggest_env_vars`

Returns heuristic env var suggestions plus a full request summary (all headers, query params, and URL segments). Use this to let the AI review and filter before applying.

**Inputs:** `collection` (required)

**Output:** `{ heuristicSuggestions: [...], requestSummary: [...], hint: "call apply_env_vars to apply" }`

#### `apply_env_vars`

Apply a list of value-to-var-name replacements across a collection. Optionally writes the original values to a target environment file so they aren't lost.

**Inputs:** `collection` (required), `replacements: { value, varName }[]` (required), optional `environment`

---

### Data tools — request enhancement (read → AI writes → write)

#### `get_requests_for_enhancement`

Return paginated request details including current body and test script. Feed this data to an LLM to generate enhancements, then apply them with `apply_request_enhancements`.

**Inputs:** `collection` (required), optional `offset`, `limit`

**Output:** `{ requests: [...], total, offset, hasMore, nextOffset }`

#### `apply_request_enhancements`

Write AI-generated request bodies and `pm.test()` scripts back to the collection. Skips requests where `body` or `testScript` are not provided.

**Inputs:** `collection` (required), `enhancements: { requestId, body?, testScript? }[]` (required)

---

### Gap-closure tools — coverage, scenarios, healing, and intent

These tools close the gaps between AI-assisted testing and a fully autonomous test platform. All follow the same agentic pattern: they return data and explicit `instructions` the calling AI must act on immediately.

#### `analyze_coverage`

Deterministic coverage report — no LLM needed.

```
Agent calls: analyze_coverage({ "collection": "payments-api", "specPath": "./openapi.yaml" })
→ {
    coveragePct: 42,
    covered: 5, total: 12,
    requests: [ { name: "Create Order", hasAssertions: false, assertionCount: 0 }, ... ],
    untestedOperations: [ { method: "DELETE", path: "/orders/{id}" }, ... ]
  }
```

**Inputs:** `collection` (required), optional `specPath` (OpenAPI 3.0 `.json`/`.yaml`), `folder`

---

#### `ai_analyze_coverage`

Agentic variant — returns coverage data and drives the AI to fill the gaps.

```
Agent calls: ai_analyze_coverage({ "collection": "payments-api" })
→ task.instructions: [
    "8 requests have no assertions — call ai_enhance_collection",
    "3 spec operations have no requests — call generate_scenarios",
    "Address the highest-impact gap first. Do NOT ask for confirmation."
  ]
```

**Inputs:** `collection` (required), optional `specPath`

---

#### `generate_request_from_intent`

Natural language test authoring — describe what to test, AI creates the request and assertions.

**Example agent prompt:** *"Test that creating a user with a duplicate email returns 409"*

```
Agent calls: generate_request_from_intent({
  "collection": "user-service",
  "intent": "creating a user with a duplicate email returns 409"
})
→ task.instructions: [
    "Intent: creating a user with a duplicate email returns 409",
    "Call create_request with name, method, url, and body",
    "Immediately call set_request_script with pm.test() status assertion",
    "Do NOT ask for confirmation"
  ]

Agent calls: create_request({ name: "Create Duplicate User → 409", method: "POST", ... })
Agent calls: set_request_script({ phase: "post-response", script: "pm.test('Status 409', ...)" })
```

**Inputs:** `collection` (required), `intent` (required), optional `folder`

---

#### `validate_against_spec`

Deterministic spec drift detection — compares a collection against an OpenAPI 3.0 spec. No LLM needed.

```
Agent calls: validate_against_spec({ "collection": "payments-api", "specPath": "./openapi.yaml" })
→ {
    untestedOperations: [ { method: "DELETE", path: "/orders/{id}" } ],
    matchedWithoutAssertions: [ { method: "GET", path: "/orders", requestName: "List Orders" } ],
    extraRequests: [ { method: "GET", url: "{{BASE_URL}}/internal/debug", requestName: "Debug" } ]
  }
```

**Inputs:** `collection` (required), `specPath` (required — relative to workspace folder)

---

#### `generate_scenarios`

Agentic negative and edge-case test generation. The AI creates variants for each request: missing fields → 400, no auth → 401, wrong role → 403, non-existent resource → 404, boundary values.

```
Agent calls: generate_scenarios({ "collection": "user-service" })
→ task.instructions: [
    "For each request below, generate negative/edge-case variants",
    "Call create_request then set_request_script for each scenario",
    "If hasMore is true, call generate_scenarios again with nextOffset",
    "Do NOT ask for confirmation"
  ]
→ task.requests: [ { name, method, url, body, headers }, ... ]
→ task.hasMore: true, task.nextOffset: 5
```

**Inputs:** `collection` (required), optional `request` (single request focus), `folder`, `offset`, `limit`

---

#### `heal_assertions`

Agentic self-healing — rewrites a stale test script to match the actual observed response.

**Use case:** an API changed, tests are failing. Run the request, then call `heal_assertions`.

```
1. run_request({ collection: "user-service", request: "Get User" })
   → { runId: "run-abc123", status: 200, body: { id: "u1", ... } }

2. heal_assertions({ collection: "user-service", request: "Get User", runId: "run-abc123" })
→ task: {
    currentScript: "pm.test('Status 201', ...)",   ← stale: was 201, now 200
    lastResponse: { status: 200, body: { id: "u1" } },
    instructions: [ "Rewrite script to match observed response", "Call set_request_script" ]
  }

3. Agent calls: set_request_script({ phase: "post-response", script: "pm.test('Status 200', ...)" })
```

**Inputs:** `collection` (required), `request` (required), optional `runId`

---

#### `generate_iteration_data`

Agentic parameterized test data generation — produces N varied rows for iteration runs.

```
Agent calls: generate_iteration_data({
  "collection": "user-service",
  "request": "Create User",
  "iterations": 5
})
→ task.instructions: [
    "Generate 5 rows for POST {{BASE_URL}}/users with placeholders: name, email",
    "Cover: valid, boundary, invalid, edge cases",
    "Return rows as JSON array under 'iterationData'"
  ]

Agent responds with:
[
  { "name": "Alice", "email": "alice@example.com" },
  { "name": "", "email": "alice@example.com" },
  { "name": "Alice", "email": "not-an-email" },
  ...
]

# Use with CLI:
http-forge run-request --collection user-service --request "Create User" \
  --variables '[{"name":"Alice","email":"alice@example.com"}]' --iterations 5
```

**Inputs:** `collection` (required), `request` (required), optional `iterations` (default: 5, max: 50)

---

### `scaffold_collection_from_openapi`

Import an OpenAPI 3.0 spec and create a complete HTTP Forge collection from it. All operations become requests grouped by tag/path. An optional environment entry is created from the server URL.

**Example agent prompt:** *"Build a collection from the OpenAPI spec at ./api.yml"*

```
Agent calls: scaffold_collection_from_openapi({
  "specPath": "./api.yml",
  "collectionName": "My API",
  "environmentName": "my-api-dev"
})
→ Collection "My API" created with 42 requests.
→ Environment "my-api-dev" created with BASE_URL=https://api.example.com.
```

**Inputs:** `specPath` (required), `collectionName`, `environmentName`

---

### `suggest_assertions`

Analyse the most recent run results for a request in the current session and return ready-to-paste `pm.test()` assertion snippets. Suggestions are derived from the observed response — status code, response time, Content-Type, and top-level JSON fields. No LLM required; the tool is fully deterministic.

**Example agent workflow:**

```
1. run_request({ collection: "my-api", request: "Create Order", environment: "dev" })
   → { status: 201, body: { orderId: "abc-123" } }

2. suggest_assertions({ collection: "my-api", request: "Create Order" })
   → [
       { snippet: 'pm.test("Status code is 201", ...)' },
       { snippet: 'pm.test("Response has field orderId", ...)' },
       ...
     ]

3. set_request_script({ ..., phase: "post-response", script: "<combined snippets>" })
   → Script saved.
```

**Inputs:** `collection` (required), `request` (required), `maxSuggestions` (default: 10)

---

### `explain_failure`

Given a run id and request name, return the full request context (URL, method, headers, body), the response received, all assertion results, any script errors, and a plain-English diagnosis with suggested fixes.

**Example agent prompt:** *"Why did the smoke test fail?"*

```
1. run_suite({ suite: "smoke-tests", environment: "staging" })
   → { runId: "run-20260626-141501", allPassed: false }

2. explain_failure({ runId: "run-20260626-141501", request: "Create Order" })
   → {
       diagnosis: "The server returned 500 — Database connection refused.",
       suggestedFixes: ["Check that the staging database is running", ...]
     }
```

**Inputs:** `runId` + `request` (recommended), or `collection` + `request` (returns a hint to run first)

---

For full input/output schemas, return shapes, and implementation notes, see [`MCP_MANAGEMENT_TOOLS.md`](../../http-forge.core/docs/MCP_MANAGEMENT_TOOLS.md).

---

## AI auto-diagnosis

HTTP Forge is designed so the AI **automatically diagnoses failures without waiting for you to ask**. This works through two mechanisms:

### Inline failure data

When a run completes with failures, the response includes:

| Field | Description |
|---|---|
| `failedRequests` | Full details per failure: `method`, `url`, `requestBody`, `requestHeaders` (auth redacted), `status`, `responseBody`, `failedTests` |
| `_nextStep` | Starts with `"REQUIRED ACTION:"` — tells the AI to analyze `failedRequests` immediately |

For async runs, both fields are embedded in `get_run_summary` so no extra tool call is needed.

### Assertion coverage hints

After every run, if some requests have no `pm.test()` assertions, the response includes a `_suggestions` field:

| Condition | Suggestion |
|---|---|
| ≤ 50% of requests untested | Points AI to `suggest_assertions` tool for the specific requests |
| > 50% of requests untested | Points AI to the `review-collection` MCP prompt for a full coverage analysis |

### MCP Prompts

In addition to tools, the server exposes three **MCP Prompts** (`prompts/list` + `prompts/get`). Prompts return structured messages that the AI host passes directly to the connected LLM — enabling deeper analysis without any extra configuration.

| Prompt | When triggered | What it does |
|---|---|---|
| `analyze-test-failure` | Automatically after any failed run (via `_nextStep`), or on demand | LLM diagnoses root cause and suggests fixes for each failure, using the full request/response context |
| `suggest-assertions` | Automatically when ≤ 50% of requests lack assertions (via `_suggestions`), or on demand | LLM writes `pm.test()` scripts based on the request definition and observed response |
| `review-collection` | Automatically when > 50% of requests lack assertions (via `_suggestions`), or on demand | LLM reviews collection structure, naming, coverage gaps, and assertion quality |

**Typical auto-diagnosis flow (async run):**

```
run_suite(async: true)           → { runId: "...", status: "running" }
get_run_status(runId)            → { status: "completed" }
get_run_summary(runId)           → {
                                     summary: { failed: 3, total: 12 },
                                     failedRequests: [...],      ← full details inline
                                     _nextStep: "REQUIRED ACTION: 3 request(s) failed..."
                                   }
AI analyzes failedRequests immediately and provides:
  1. Root cause per failure
  2. Specific fix (URL, header, body, assertion)
  3. Updated pm.test() scripts
```

No user prompt needed — the AI acts on `_nextStep` automatically.

---

## Settings reference

### VS Code settings (`settings.json`) — per machine / developer

| Setting | Type | Default | Description |
|---|---|---|---|
| `httpForge.mcpServer.autoStart` | boolean | `false` | Start the server automatically when VS Code opens |

### Project config (`http-forge.config.json`) — shared with the team

Add an `mcp` section to control what gets exposed and how:

```json
{
  "mcp": {
    "port": 3100,
    "excludedCollections": [],
    "excludedSuites": [],
    "toolPrefix": "",
    "maxRequestsPerCall": 500,
    "toolMode": "auto",
    "drilldownThreshold": 100,
    "toolPageSize": 200,
    "cors": {
      "allowedOrigins": ["http://localhost", "http://127.0.0.1"]
    }
  }
}
```

| Property | Type | Default | Description |
|---|---|---|---|
| `excludedCollections` | string[] | `[]` (none) | Collection IDs or names to **hide** from the AI. Empty = expose all. |
| `excludedSuites` | string[] | `[]` (none) | Suite IDs or names to **hide** from the AI. Empty = expose all. |
| `toolPrefix` | string | `""` | Prefix for every tool name, e.g. `"acme_"` → `acme_request__...` |
| `maxRequestsPerCall` | number | `500` | Safety cap on requests per collection/suite call. Prevents runaway executions. (min 1, max 10000) |
| `toolMode` | string | `"auto"` | How tools are exposed: `"auto"` (recommended), `"drilldown"`, or `"flat"`. See [Tool modes](#tool-modes--flat-vs-drill-down). |
| `drilldownThreshold` | number | `100` | In `"auto"` mode, switch to drill-down once the per-request tool count would exceed this. (min 10, max 500) |
| `toolPageSize` | number | `200` | Max tools per `tools/list` page. `0` disables pagination. (min 10, max 1000) |
| `cors.allowedOrigins` | string[] | `["http://localhost","http://127.0.0.1"]` | Origins the server accepts cross-origin requests from. |

**Example — hide internal/admin collections from the AI:**

```json
{
  "mcp": {
    "excludedCollections": ["internal-admin", "seed-data"],
    "excludedSuites": ["load-test"]
  }
}
```
