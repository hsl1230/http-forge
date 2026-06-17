# MCP Server

HTTP Forge can expose your collections and test suites as an **MCP (Model Context Protocol) server**, letting AI agents (Claude, GitHub Copilot, and others) discover and execute your API requests directly.

## How it works

When the MCP server is running, AI agents see every request in your collections and every test suite as a callable tool. They always reflect the current state — no re-export needed when you change a collection.

```
AI Agent
  → POST http://localhost:3100  (JSON-RPC 2.0)
  → HTTP Forge executes the request using your saved config
  → Returns structured result (status, body, assertions, report path)
```

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
      "url": "http://localhost:3100"
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

Once connected, the AI automatically discovers all tools. There are three tool types:

| Tool name pattern | What it does |
|---|---|
| `request__<colId>__<reqId>` | Execute a single saved request |
| `collection__<colId>` | Run all requests in a collection sequentially |
| `suite__<suiteId>` | Run a test suite (with full script and assertion support) |

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

### 5. Run a test suite

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

### 6. Chain requests — use output from one as input to the next

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

### 7. Compare environments

> "Run GET /api/config on dev and staging and tell me if the responses are different"

The AI calls the same request twice with different environments and compares the results.

---

### 8. Validate after deployment

> "Run the Smoke Test suite on production and tell me if I'm safe to proceed"

> "Run all requests in the Health Check collection and confirm everything returns 200"

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
| `include` | array | `perRequest` (per-request details), `failedOnly` (failed request details), `consoleOutput` (script console output per request) |

### Test suite arguments

| Argument | Type | Description |
|---|---|---|
| `environment` | string | Environment name |
| `iterations` | number | Override the suite's default iteration count |
| `stopOnError` | boolean | Stop on first failure |
| `delay` | number | Delay between requests (ms) |
| `variables` | object | Inject variables into every request |
| `requestFilter` | string[] | Run only requests whose names contain one of these strings |
| `include` | array | `perRequest` (per-request details), `failedOnly` (failed request details), `consoleOutput` (script console output per request) |

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
    "uri": "file:///path/to/.http-forge-cache/results/suite-id/run-id/report.html",
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

The report URI is returned in the MCP tool response as `report.uri` (a `file://` path). AI clients render this as a clickable link. In the VS Code test suite panel, the **Export HTML** button opens the same report in your system browser.

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
    "maxRequestsPerCall": 50,
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
| `maxRequestsPerCall` | number | `50` | Safety cap on requests per collection/suite call. Prevents runaway executions. |
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
