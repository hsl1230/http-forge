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
  "httpForge.mcpServer.autoStart": true,
  "httpForge.mcpServer.port": 3100
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

The AI starts the run with `async: true` (gets back a `runId`), then polls `get_run_status` and finally calls `get_run_summary` to report.

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

## Settings reference

### VS Code settings (`settings.json`) — per machine / developer

| Setting | Type | Default | Description |
|---|---|---|---|
| `httpForge.mcpServer.port` | number | `3100` | Port the server listens on |
| `httpForge.mcpServer.autoStart` | boolean | `false` | Start the server automatically when VS Code opens |

### Project config (`http-forge.config.json`) — shared with the team

Add an `mcp` section to control what gets exposed and how:

```json
{
  "mcp": {
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
