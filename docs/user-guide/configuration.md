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
    "modulePaths": ["./src", "./lib"]
  },
  "runner": {
    "resultsRetentionDays": 7,
    "indexPageSize": 1000,
    "recentErrorsLimit": 20
  },
  "environments": {
    "default": "dev"
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
| **runner** | `resultsRetentionDays` | `7` | Number of days to retain test results |
| | `indexPageSize` | `1000` | Pagination size for result index |
| | `recentErrorsLimit` | `20` | Maximum number of recent errors to track |
| **environments** | `default` | `"dev"` | Default environment name to use |
| **restClientExport** | `path` | `"collections-rest-client"` | Location where REST‑Client export output is written. Relative to workspace root when not absolute. |
|  | `mergeGlobals` | `true` | Merge globals into environment files when exporting (see import-export docs). |
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
