# Security & Sensitive Data

HTTP Forge automatically protects sensitive data from being persisted in plaintext across history files, test suite results, and shared history.

## Automatic Redaction

When a request is executed, HTTP Forge writes history entries, full responses, and suite results to disk. Before writing, all sensitive values are replaced with `***`.

### What gets redacted

| Location | Redacted fields |
|----------|----------------|
| **Request headers** | `Authorization`, `Proxy-Authorization`, `WWW-Authenticate`, and any header containing `token`, `cookie`, `secret`, `credential`, `api-key`, `bearer`, or `session-id` |
| **URL query params** | Any parameter name containing `password`, `token`, `secret`, `api_key`, `client_secret`, `jwt`, etc. |
| **Request body (JSON)** | Any JSON key containing `password`, `token`, `secret`, `credential`, `api_key`, `private_key`, `auth_code`, `jwt`, `cookie`, etc. — applied recursively |
| **Request body (form)** | URL-encoded form fields matching the same patterns |
| **Response headers** | Same header patterns as request headers (e.g. `Set-Cookie`) |
| **Response cookies** | Cookie names matching sensitive patterns |

### What is NOT redacted

- **`originalConfig`** — The unresolved request template (with `{{variable}}` placeholders) is never redacted. It contains no secret values since variables haven't been resolved yet.
- **Response bodies** — Response content is not redacted because field names vary too widely to pattern-match safely.
- **In-memory data** — Redaction only applies to data written to disk. The Request Tester UI shows the full unredacted response for debugging.

### Examples

A request with an `Authorization` header and sensitive body:

```
POST https://api.example.com/oauth/token
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/x-www-form-urlencoded

client_secret=abc123&grant_type=client_credentials
```

Gets stored in history as:

```
POST https://api.example.com/oauth/token
Authorization: ***
Content-Type: application/x-www-form-urlencoded

client_secret=***&grant_type=***
```

Custom headers are also detected:

```
avs-token: eyJ...         → avs-token: ***
corp-access-token: abc   → corp-access-token: ***
up-cookie: session=xyz    → up-cookie: ***
```

## Where redaction applies

| Storage location | Gitignored? | Redacted? |
|-----------------|-------------|-----------|
| Local history (`.http-forge/.cache/histories/`) | Yes | Yes |
| Shared history (`shared-histories/`) | No — can be committed | Yes |
| Full responses (`{entryId}.json`) | Yes | Yes |
| Suite results (`.http-forge/.cache/results/`) | Yes | Yes |
| Environment files (`environments/*.local.json`) | Yes | No redaction needed — these are source files |
| Request files (`request.json`, `body.json`) | No | No redaction needed — contain `{{variable}}` templates, not resolved values |

## Best Practices

1. **Use `.local.json` files for secrets** — Store passwords, API keys, and tokens in `{env}.local.json` or `_global.local.json`. These files are gitignored by convention.

2. **Use `{{variable}}` templates** — Reference secrets by variable name in request definitions (e.g. `{{api_key}}`). The resolved value is only present at runtime and gets redacted in persisted files.

3. **Review shared history before committing** — While sensitive headers and body fields are redacted, review shared history entries to ensure no unexpected data leaks through undetected field names.

4. **Don't hardcode secrets in request files** — Avoid placing actual credentials directly in `request.json` or `body.json`. Use environment variables instead.

## Environment File Layout

```
environments/
├── _global.json          ← Shared, committed (no secrets)
├── _global.local.json    ← Gitignored (secrets)
├── dev.json              ← Shared, committed (no secrets)
├── dev.local.json        ← Gitignored (secrets)
├── staging.json
└── staging.local.json
```

The `.local.json` files override variables from the shared config and are the recommended place for credentials:

```json
// dev.local.json
{
  "variables": {
    "api_key": "sk-live-abc123...",
    "password": "my-secret-password"
  }
}
```
