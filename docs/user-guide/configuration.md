# HTTP Forge Configuration

HTTP Forge uses `http-forge.config.json` in the workspace root.

## File location
```
your-workspace/
├── http-forge.config.json    ← Configuration
├── http-forge.secrets.json   ← Secrets (gitignored)
└── ...
```

## Default behavior
If the file is missing, HTTP Forge uses defaults:
- Collections in `./http-forge/collections`
- Environments in `./http-forge/environments`
- History in `./.http-forge-cache/histories`
- Results in `./.http-forge-cache/results`

## Complete default configuration
```json
{
  "version": "1.0",
  "storage": {
    "format": "folder",
    "root": "./http-forge",
    "history": "./.http-forge-cache/histories",
    "results": "./.http-forge-cache/results"
  },
  "request": {
    "timeout": 30000,
    "followRedirects": true,
    "maxRedirects": 10,
    "strictSSL": true
  },
  "scripts": {
    "modulePaths": ["./src", "./lib"],
    "scope": "shared"
  },
  "runner": {
    "resultsRetentionDays": 7,
    "indexPageSize": 1000,
    "recentErrorsLimit": 20
  },
  "environments": {
    "default": "dev"
  },
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
  },
  "proxy": null
}
```

## Configuration reference
| Section | Property | Default | Description |
|---------|----------|---------|-------------|
| **version** | - | `"1.0"` | Configuration schema version |
| **storage** | `format` | `"folder"` | Storage format for collections (folder-based) |
| | `root` | `"./http-forge"` | Root directory for collections, environments, flows, and suites |
| | `history` | `"./.http-forge-cache/histories"` | Directory for request history storage |
| | `results` | `"./.http-forge-cache/results"` | Directory for test/suite results storage |
| **request** | `timeout` | `30000` | Default request timeout in milliseconds (30 seconds) |
| | `followRedirects` | `true` | Whether to follow HTTP redirects automatically |
| | `maxRedirects` | `10` | Maximum number of redirects to follow |
| | `strictSSL` | `true` | Whether to verify SSL/TLS certificates |
| **scripts** | `modulePaths` | `["./src", "./lib"]` | Paths to search for pre/post-request script modules |
| | `scope` | `"shared"` | Script execution scope. `"shared"` runs all script levels (collection → folder → request) and both phases in one scope, so `var`/`function` declarations leak across them. `"isolated"` runs each script level in its own scope for Postman compatibility — state must pass through `pm.variables` / `pm.environment` / `pm.globals`. |
| **runner** | `resultsRetentionDays` | `7` | Number of days to retain test results |
| | `indexPageSize` | `1000` | Pagination size for result index |
| | `recentErrorsLimit` | `20` | Maximum number of recent errors to track |
| **environments** | `default` | `"dev"` | Default environment name to use |
| **restClientExport** | `path` | `"collections-rest-client"` | Location where REST‑Client export output is written. Relative to workspace root when not absolute. |
|  | `mergeGlobals` | `true` | Merge globals into environment files when exporting (see import-export docs). |
| **mcp** | `excludedCollections` | `[]` | Collection IDs or names to **hide** from the MCP server. Empty = expose all. |
|  | `excludedSuites` | `[]` | Suite IDs or names to **hide** from the MCP server. Empty = expose all. |
|  | `toolPrefix` | `""` | Prefix added to every MCP tool name (e.g. `"myapp_"`). |
|  | `maxRequestsPerCall` | `500` | Maximum requests the MCP server executes in a single collection/suite call. (min 1, max 10000) |
|  | `toolMode` | `"auto"` | How tools are exposed: `"auto"` (recommended — flat below threshold then drilldown), `"drilldown"` (always generic tools), or `"flat"` (one tool per request; avoid for large workspaces). |
|  | `drilldownThreshold` | `100` | In `"auto"` mode, switch to drill-down once the per-request tool count would exceed this. (min 10, max 500) |
|  | `toolPageSize` | `200` | Max tools per `tools/list` page. `0` = no pagination. (min 10, max 1000) |
|  | `cors.allowedOrigins` | `["http://localhost","http://127.0.0.1"]` | Origins the MCP server accepts cross-origin requests from. |
| **proxy** | - | `null` | Proxy URL (set to a URL string to enable proxy) |

## Directory structure
```
your-workspace/
├── http-forge.config.json
├── http-forge/                    ← storage.root
│   ├── collections/
│   ├── environments/             ← folder-based environment files
│   ├── flows/
│   └── suites/
└── .http-forge-cache/             ← cache (gitignored)
    ├── histories/
    └── results/
```

## Environment files (folder layout)
```
http-forge/environments/
├── _global.json      # global variables + default headers
├── _secrets.json     # local secrets (gitignored)
├── dev.json
├── sit.json
└── prod.json
```

## Secrets file
Store secrets in `http-forge.secrets.json`:
```json
{
  "apiKey": "your-api-key",
  "token": "your-token"
}
```

## Example: project-specific paths
```json
{
  "version": "1.0",
  "storage": {
    "root": "./api-tests",
    "history": "./api-tests/.cache/histories",
    "results": "./api-tests/.cache/results"
  },
  "request": {
    "timeout": 60000,
    "strictSSL": false
  },
  "environments": {
    "default": "sit"
  }
}
```

## Partial configuration
Missing fields use defaults:
```json
{
  "version": "1.0",
  "storage": {
    "root": "./my-api-tests"
  },
  "environments": {
    "default": "local"
  }
}
```

## MCP server project settings

The `mcp` section controls what the [MCP server](mcp-server.md) exposes to AI agents. All fields are optional — by default everything is exposed.

**Hide sensitive collections from AI:**
```json
{
  "mcp": {
    "excludedCollections": ["internal-admin", "seed-data"],
    "excludedSuites": ["load-test"]
  }
}
```

**Add a tool name prefix (useful when multiple projects share the same AI agent):**
```json
{
  "mcp": {
    "toolPrefix": "myapp_"
  }
}
```

**Raise the request cap for large suites:**
```json
{
  "mcp": {
    "maxRequestsPerCall": 200
  }
}
```

**Large workspaces — keep the tool list small with drill-down mode:**
```json
{
  "mcp": {
    "toolMode": "auto",
    "drilldownThreshold": 200
  }
}
```
With many collections, a tool-per-request list can grow huge. `"auto"` keeps the
default `"flat"` behavior until the request-tool count exceeds
`drilldownThreshold`, then switches to a small generic toolset
(`list_collections`, `list_requests`, `run_request`, `run_folder`,
`run_collection`, `run_suite`). Use `"drilldown"` to force it on regardless of
size. See [MCP Server](mcp-server.md#tool-modes--flat-vs-drill-down) for details.

> **Note:** Port and auto-start are VS Code settings (`httpForge.mcpServer.port`, `httpForge.mcpServer.autoStart`), not project config. See [MCP Server](mcp-server.md) for details.
