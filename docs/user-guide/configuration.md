# HTTP Forge Configuration

HTTP Forge uses `.http-forge/http-forge.config.json` in the workspace root.

## File location

```
your-workspace/
|-- .http-forge/
|   `-- http-forge.config.json
|-- http-forge.secrets.json   (legacy/deprecated, ignored)
`-- ...
```

## Migration mapping

| Old location | Current location |
|---|---|
| `http-forge.config.json` | `.http-forge/http-forge.config.json` |
| `http-forge-assets/` | `.http-forge/assets/` |
| `.http-forge-cache/` | `.http-forge/.cache/` |

## Default behavior
If the config file is missing, HTTP Forge uses defaults:
- storage root: `./.http-forge/assets`
- history: `./.http-forge/.cache/histories`
- results: `./.http-forge/.cache/results`

You do not need to copy every default into your project config. A minimal
`http-forge.config.json` is valid; only override the fields you want to change.

## Complete default configuration

```json
{
  "version": "1.0",
  "storage": {
    "format": "folder",
    "root": "./.http-forge/assets",
    "history": "./.http-forge/.cache/histories",
    "results": "./.http-forge/.cache/results"
  },
  "request": {
    "timeout": 30000,
    "followRedirects": true,
    "maxRedirects": 10,
    "strictSSL": true,
    "tls": {},
    "certificates": []
  },
  "scripts": {
    "modulePaths": ["./.http-forge/assets/src", "./.http-forge/assets/lib"],
    "scope": "shared",
    "timeout": 5000
  },
  "runner": {
    "resultsRetentionDays": 7,
    "indexPageSize": 1000,
    "recentErrorsLimit": 20,
    "report": {
      "maxBodyChars": 100000,
      "embedBodies": "failed"
    }
  },
  "environments": {
    "default": "dev"
  },
  "restClientExport": {
    "path": "collections-rest-client",
    "mergeGlobals": true
  },
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
  },
  "proxy": null,
  "secrets": {
    "providers": {
      "aws": { "provider": "aws" },
      "azure": { "provider": "azure", "vaultUrl": "" },
      "gcp": { "provider": "gcp" },
      "vault": { "provider": "vault" },
      "op": { "provider": "1password" },
      "doppler": { "provider": "doppler" }
    }
  }
}
```

## Proxy support

HTTP Forge routes all requests through the configured proxy using a native CONNECT tunnel — no extra npm packages required.

### Basic proxy

```json
{
  "proxy": {
    "http": "http://proxy.corp.com:8080",
    "https": "http://proxy.corp.com:8080"
  }
}
```

### Authenticated proxy

Embed credentials directly in the proxy URL:

```json
{
  "proxy": {
    "http": "http://user:pass@proxy.corp.com:8080",
    "https": "http://user:pass@proxy.corp.com:8080"
  }
}
```

### Bypass list

```json
{
  "proxy": {
    "https": "http://proxy.corp.com:8080",
    "bypass": ["localhost", "127.0.0.1", "*.internal.corp.com"]
  }
}
```

Bypass patterns support:
- Exact host: `api.local`
- Wildcard subdomain: `*.corp.example.com`
- Wildcard all: `*`

### Disabling proxy

Set `proxy` to `null` (default) to disable:

```json
{
  "proxy": null
}
```

### How it works

- **HTTPS targets**: HTTP Forge opens a TCP connection to the proxy and sends a `CONNECT` tunnel request, then upgrades to TLS. The proxy only sees the target host/port, not the request content.
- **HTTP targets**: requests are sent to the proxy host with an absolute URI path as required by HTTP/1.1.
- **Proxy auth**: `Proxy-Authorization: Basic ...` is added automatically when credentials appear in the proxy URL.
- **Live reload**: saving `.http-forge/http-forge.config.json` with updated proxy settings takes effect immediately for the next request — no VS Code restart needed.

## TLS and certificate support

HTTP Forge supports TLS settings in both project config and per-request settings.

### Global defaults (`request.tls`)
Use this for shared CA/client-cert defaults:

```json
{
  "request": {
    "tls": {
      "caPath": "./certs/ca.pem",
      "certPath": "./certs/client-cert.pem",
      "keyPath": "./certs/client-key.pem",
      "passphrase": "",
      "servername": "api.example.com"
    }
  }
}
```

### Host-based mappings (`request.certificates`)
Use this for Postman-style host matching:

```json
{
  "request": {
    "certificates": [
      {
        "host": "api.internal.example.com",
        "certPath": "./certs/client-cert.pem",
        "keyPath": "./certs/client-key.pem",
        "enabled": true
      },
      {
        "host": "*.corp.example.com",
        "pfxPath": "./certs/client.p12",
        "passphrase": "",
        "enabled": true
      }
    ]
  }
}
```

Supported TLS fields:
- `caPath`
- `certPath`
- `keyPath`
- `pfxPath`
- `passphrase`
- `servername`

## Configuration reference

| Section | Property | Default | Description |
|---|---|---|---|
| version | - | `"1.0"` | Config schema version |
| storage | `format` | `"folder"` | Storage format |
| storage | `root` | `"./.http-forge/assets"` | Root for collections/environments/flows/suites |
| storage | `history` | `"./.http-forge/.cache/histories"` | History location |
| storage | `results` | `"./.http-forge/.cache/results"` | Suite results location |
| request | `timeout` | `30000` | Request timeout in ms |
| request | `followRedirects` | `true` | Follow redirects |
| request | `maxRedirects` | `10` | Max redirect count |
| request | `strictSSL` | `true` | Verify server TLS certificates |
| request | `tls` | `{}` | Default TLS options |
| request | `certificates` | `[]` | Host-based cert mappings |
| scripts | `modulePaths` | `["./.http-forge/assets/src","./.http-forge/assets/lib"]` | Module lookup paths |
| scripts | `scope` | `"shared"` | `shared` or `isolated` script scoping |
| scripts | `timeout` | `5000` | Per-script execution budget (ms) |
| runner | `resultsRetentionDays` | `7` | Result retention in days |
| runner | `indexPageSize` | `1000` | Result index page size |
| runner | `recentErrorsLimit` | `20` | Number of recent errors tracked |
| runner.report | `maxBodyChars` | `100000` | Max characters per request/response body embedded in HTML reports. Larger bodies are truncated; full bodies remain in on-disk result files |
| runner.report | `embedBodies` | `"failed"` | Which request bodies to embed in HTML reports: `"all"`, `"failed"`, or `"none"` |
| environments | `default` | `"dev"` | Default environment name |
| restClientExport | `path` | `"collections-rest-client"` | REST Client export path |
| restClientExport | `mergeGlobals` | `true` | Merge globals on export |
| mcp | `port` | `3100` | MCP server port |
| mcp | `excludedCollections` | `[]` | Hide collections from MCP |
| mcp | `excludedSuites` | `[]` | Hide suites from MCP |
| mcp | `toolPrefix` | `""` | Prefix for MCP tools |
| mcp | `maxRequestsPerCall` | `500` | Max requests per run call |
| mcp | `toolMode` | `"auto"` | `auto`, `drilldown`, `flat`, or `execution-only`. `execution-only` exposes only runtime tools (~20) — best for AI agents with workspace file access. In `auto` mode, upgrades to `execution-only` automatically when `.http-forge/AGENTS.md` exists. |
| mcp | `drilldownThreshold` | `100` | Auto-switch threshold |
| mcp | `toolPageSize` | `200` | Max tools per page |
| mcp | `cors.allowedOrigins` | localhost origins | MCP CORS allowlist |
| proxy | `http` | - | HTTP proxy URL (e.g. `http://proxy.corp.com:8080`) |
| proxy | `https` | - | HTTPS proxy URL. Falls back to `proxy.http` if omitted |
| proxy | `bypass` | `[]` | Host patterns to skip proxy (exact or wildcard, e.g. `*.internal.com`) |
| secrets | `providers` | built-in aliases | Cloud secret provider aliases/config |

## Directory structure

```
your-workspace/
|-- .http-forge/
|   |-- http-forge.config.json
|   |-- assets/
|   |   |-- collections/
|   |   |-- environments/
|   |   |-- flows/
|   |   `-- suites/
|   `-- .cache/
|       |-- histories/
|       `-- results/
`-- ...
```

## Secrets
Workspace-level `http-forge.secrets.json` is no longer used.

Use `secrets.providers` inside `.http-forge/http-forge.config.json` instead.

Store secrets in environment-local files under your environments folder (for example `dev.local.json` or `_global.local.json`) and keep them gitignored.

## Partial configuration
Missing fields fall back to defaults.

```json
{
  "version": "1.0",
  "storage": {
    "root": "./api-tests/assets"
  },
  "environments": {
    "default": "sit"
  }
}
```

## MCP project settings

The `mcp` section controls what the MCP server exposes to AI agents.

```json
{
  "mcp": {
    "excludedCollections": ["internal-admin"],
    "excludedSuites": ["load-test"],
    "toolMode": "auto",
    "drilldownThreshold": 200
  }
}
```

> Note: MCP port is project config (`mcp.port` in `.http-forge/http-forge.config.json`, default `3100`). Auto-start remains a VS Code setting (`httpForge.mcpServer.autoStart`).
