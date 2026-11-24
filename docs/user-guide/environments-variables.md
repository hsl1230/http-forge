# Environments & Variables

HTTP Forge supports multiple variable scopes to keep request data consistent across environments.

## Variable levels

HTTP Forge has two families of variables:

- **Static variables** — loaded from configuration files before a request runs.
- **Runtime variables** — created, updated, or removed by scripts through the `pm.*` APIs.

At resolution time, the runtime layer of a scope sits above the static layer of the same scope.

### Static variables

| Level | Where it lives | Applies to | Notes |
|---|---|---|---|
| Global | `environments/_global.json` → `variables` | All requests | Committed defaults |
| Global local | `environments/_global.local.json` → `variables` | All requests | Overrides `_global.json`; gitignored by convention |
| Environment | `environments/<env>.json` → `variables` | Selected/run environment | Initial values |
| Environment local | `environments/<env>.local.json` → `variables` | Selected/run environment | Overrides `<env>.json`; gitignored by convention |
| Collection | `collections/<collection>/collection.json` → `variables` | Requests in that collection | Per-collection defaults |

OS keychain secrets are an optional config-time environment layer. They are not stored in a JSON file; see [OS Keychain secrets](#os-keychain-secrets-recommended) below.

Within the same file-backed scope, the later file wins:

```
_global.json  <  _global.local.json
<env>.json    <  <env>.local.json
```

Collection variables are read from `collection.json`; scripts can add a runtime overlay on top of them (see below).

### Runtime variables

| API | Overlay | Scope | Persistence |
|---|---|---|---|
| `pm.globals.set/unset/clear` | `_global*.json` | All requests in the process/run | Memory only; lost on VS Code reload/restart |
| `pm.environment.set/unset/clear` | `<env>*.json` | Active environment | Stored as workspace “Current Values”; survives reloads in VS Code, run-only in CLI. A later run reads these persisted values only when “Load persisted environment values” is enabled; otherwise it starts from the environment file values |
| `pm.collectionVariables.set/unset/clear` | `collection.json` variables | That collection | Memory only; kept for the session/run |
| `pm.variables.set/unset/clear` | All scopes (top tier) | Request execution; suite/flow runners may carry local values forward | Not persisted across runs |

Runtime writes do not modify the underlying files:

- `pm.environment.set()` updates the environment’s Current Values, not `<env>.local.json`.
- `pm.globals.set()` updates the in-memory global store, not `_global.local.json`.
- `pm.collectionVariables.set()` updates the collection’s in-memory variables, not `collection.json`.

`pm.variables` is the merged view: reads fall through the cascade, but writes go to the request-local top tier. Within one request, `pm.variables.set()` wins over every other scope for the rest of that execution (pre-request and post-response). A standalone Request Tester run starts with an empty local scope; suite and flow runners may carry the resulting local snapshot into later requests.

The Environment and Collection editors expose a **Current value** column next to the file-backed value, so runtime values can be viewed and edited without changing the committed files.

## Variable syntax
Use `{{variableName}}` anywhere:
- URL/path
- Params
- Query
- Headers
- Body
- Scripts

### Example
```
{{baseUrl}}/accounts/{{accountId}}
```

## Resolution order

When the same key exists at multiple scopes, the most specific value wins:

1. `pm.variables` / request-local runtime values
2. Environment
3. Collection
4. Globals

Within each scope, runtime values sit above the static layer:

```
Environment:  <env>.json
           <  <env>.local.json
           <  pm.environment.set()
           <  keychain secret value

Collection:   collection.json variables
           <  pm.collectionVariables.set()

Globals:      _global.json
           <  _global.local.json
           <  pm.globals.set()
```

### Why this order?

- `.local.json` overrides the shared file because it is the machine/developer-specific initial value.
- `pm.environment.set()` overrides both files because it is the current value for the active environment, matching Postman’s Initial Values vs Current Values model.
- A keychain secret overrides the runtime environment value because the keychain is the authoritative source for a variable declared as a secret. Runtime writes do not update the keychain, so they must not mask it.

### `unset` behavior

`unset()` removes the runtime overlay for that key; it does not delete the static file value. Resolution falls back to the next layer:

```
pm.environment.set('token', '...')
        ↓ unset
<env>.local.json
        ↓ if absent
<env>.json
        ↓ if absent
_global.local.json / _global.json
```

For a keychain-secret variable, the keychain value still wins after the runtime value is unset. To change it, update the keychain value (or remove the secret flag).

## Environment selection
The environment dropdown controls:
- Variable resolution
- Default headers
- Environment‑specific credentials

### Active run environment (CLI & multi-request runs)
During a collection or suite run, variables written by scripts (`pm.environment.set()`) are stored against the **environment the run is using**, and subsequent requests in the same run resolve `{{var}}` against that same environment. This makes chained requests work even when running headless — e.g. `http-forge run-suite smoke --env auth` — where the run's `--env` differs from the environment currently selected in the UI. A later request can read a token set by an earlier request without it leaking into, or being read from, the selected environment.

## Local secrets
Store secrets in gitignored `.local.json` files alongside your environment configs.
Reference them by name from environments or scripts.

When requests are executed, resolved secret values in headers and body fields are automatically redacted before being written to history or result files. See [Security & Sensitive Data](security.md) for details.

### Folder layout example
```
http-forge/environments/
├── _global.json
├── _global.local.json
├── dev.json
└── dev.local.json
```

## OS Keychain secrets (recommended)

For the strongest protection, store secret variable values in the **OS keychain** (Windows Credential Manager, macOS Keychain, or Linux Secret Service) via VS Code's `SecretStorage` API. Values stored this way:

- Never appear in any JSON file on disk
- Are never committed to version control
- Survive VS Code restarts — values are retrieved from the OS keychain on startup
- Are resolved transparently via `{{varName}}` — no change to request syntax needed

### How to use

1. Open **Environment Settings** (gear icon in the Environments sidebar)
2. Select an environment
3. Add a variable row with the key name (e.g. `apiKey`)
4. Click the 🔒 lock icon on that row — the value moves to the keychain
5. The row now shows `••••••` — the plaintext value is no longer stored in the config file

To update the value: type a new value into the masked input and click **Save**.  
To remove it from the keychain entirely: click the `×` remove button on the secret row.  
To move it back to plaintext: click the 🔒 icon again (demote).

### Usage in requests

Reference the secret variable exactly like any other:
```
Authorization: Bearer {{apiKey}}
GET {{baseUrl}}/users
```

The template engine resolves `{{apiKey}}` from the secure cache at execution time.

### CI/CD (no keychain available)

In headless environments, inject secret values via the `--var` flag or environment variables:
```bash
# --var flag
http-forge run-suite smoke --env prod --var apiKey=$API_KEY

# or via process.env (automatically bridged)
API_KEY=mytoken http-forge run-suite smoke --env prod
```

See [CLI Reference](../../../http-forge.cli/README.md) for full details.

## Cloud secret providers (`{{secret:alias/path}}`)

For team environments and CI/CD pipelines, reference secrets stored in external vaults directly in request files using the `{{secret:alias/path}}` syntax. No value is ever stored in HTTP Forge — the provider fetches it at execution time using your ambient credentials.

| Provider | Token syntax |
|---|---|
| AWS Secrets Manager | `{{secret:aws/myapp/prod}}` or `{{secret:aws/myapp/prod#field}}` or `{{secret:aws/myapp/prod.field}}` |
| Azure Key Vault | `{{secret:azure/my-secret-name}}` or `{{secret:azure/my-secret-name.field}}` |
| Google Secret Manager | `{{secret:gcp/my-secret-name}}` or `{{secret:gcp/my-secret-name.field}}` |
| HashiCorp Vault | `{{secret:vault/myapp/prod}}` or `{{secret:vault/myapp/prod#field}}` or `{{secret:vault/myapp/prod.field}}` |
| 1Password | `{{secret:op/<vault>/<item>/<field>}}` (or `{{secret:op/<item>/<field>}}` when a default vault is configured) |
| Doppler | `{{secret:doppler/API_KEY}}` or `{{secret:doppler/API_KEY.field}}` |

Use dot-notation (`.path.to.key` or `[0]`) to extract nested values from bundled JSON secrets.
See the [Secret Providers guide](secret-providers.md#json-path-resolution-secret-bundling) for details.

All six aliases work zero-config when the matching credentials/env vars are present. For setup, per-provider configuration, SDK installation, and CLI/CI usage, see the **[Secret Providers guide](secret-providers.md)**.

## File watching
Changes to environment JSON files automatically:
- Refresh the **Environments tree view** in the sidebar
- Reload **all open Request Tester panels** with the latest resolved environment data

No manual refresh is needed — edits from other VS Code tabs, external editors, or git operations are reflected immediately.

_global.json
```json
{
	"variables": {
		"tenant": "CORP",
		"locale": "ENG"
	},
	"defaultHeaders": {}
}
```

dev.json
```json
{
	"name": "dev",
	"variables": {
		"baseUrl": "http://localhost:3000"
	}
}
```

## Common patterns
- `baseUrl` per environment
- `apiKey` per environment
- `tenant`, `locale`, `region` variables

### Example environment file
```json
{
	"variables": {
		"baseUrl": "https://api.example.com",
		"apiKey": "{{API_KEY}}",
		"tenant": "corp"
	}
}
```

## Tips
- Keep variable names consistent across environments
- Prefer collection variables for per‑collection defaults

---

## Template Engine — Filters, Expressions & String Concatenation

For a complete supported syntax reference for `{{ }}` templates, see [Template Syntax Reference](template-syntax.md).

HTTP Forge extends the `{{variable}}` syntax with **filter pipes**, **JavaScript expressions**, and **string concatenation** — all usable in URL, headers, body, params, and scripts.

### Filter Pipes

Chain filters using `|` (pipe) after any variable or value:

```
{{variable | filter1 | filter2(args)}}
```

#### String Filters
| Filter | Example | Result |
|---|---|---|
| `upper` | `{{name \| upper}}` | `"ALICE"` |
| `lower` | `{{name \| lower}}` | `"alice"` |
| `trim` | `{{input \| trim}}` | Removes whitespace |
| `length` | `{{name \| length}}` | `5` |
| `substring(start, end)` | `{{name \| substring(0, 3)}}` | `"Ali"` |
| `replace(search, replacement)` | `{{text \| replace("old", "new")}}` | Global replace |
| `split(separator)` | `{{csv \| split(",")}}` | Splits into array |
| `join(separator)` | `{{array \| join(", ")}}` | Joins array to string |
| `removeQuotes` | `{{text \| removeQuotes}}` | Strips `"` and `'` |
| `removeSpaces` | `{{text \| removeSpaces}}` | Strips all whitespace |
| `format(template, ...)` | `{{firstName \| format("{0} {1}", lastName)}}` | `"Alice Smith"` |

#### Math Filters
| Filter | Example | Result |
|---|---|---|
| `add(n)` | `{{price \| add(tax)}}` | Adds variable `tax` |
| `subtract(n)` | `{{total \| subtract(5)}}` | Subtracts 5 |
| `multiply(n)` | `{{price \| multiply(quantity)}}` | Multiplies by variable |
| `abs` | `{{value \| abs}}` | Absolute value |

#### Encoding Filters
| Filter | Example | Result |
|---|---|---|
| `btoa` | `{{text \| btoa}}` | Base64 encode |
| `atob` | `{{encoded \| atob}}` | Base64 decode |
| `urlEncode` | `{{query \| urlEncode}}` | URL encode |
| `urlDecode` | `{{encoded \| urlDecode}}` | URL decode |

#### Hash Filters
| Filter | Example | Result |
|---|---|---|
| `hash(algo, encoding)` | `{{text \| hash("sha256", "hex")}}` | SHA-256 hex hash |
| `hmac(secret, algo, encoding)` | `{{text \| hmac("mySecret", "sha256")}}` | HMAC signature |

Supported algorithms: `md5`, `sha1`, `sha256`, `sha512`. Default encoding: `base64`.

#### Array Filters
| Filter | Example | Result |
|---|---|---|
| `first` | `{{items \| first}}` | First element |
| `last` | `{{items \| last}}` | Last element |
| `at(index)` | `{{items \| at(2)}}` | Element at index |
| `slice(start, end)` | `{{items \| slice(0, 3)}}` | Sub-array |
| `unique` | `{{items \| unique}}` | Deduped array |
| `filter(expr)` | `{{users \| filter(age>25)}}` | Filter by condition |
| `map(prop)` | `{{users \| map("name")}}` | Extract property |

##### Filter operators
`>`, `>=`, `<`, `<=`, `=`, `!=`, `*=` (contains), `^=` (starts with), `$=` (ends with)

```
{{users | filter(age>25) | map("name") | join(", ")}}  → "Alice, Charlie"
{{users | filter(address.city=NYC) | first}}            → nested path filter
```

#### Object Filters
| Filter | Example | Result |
|---|---|---|
| `prop(path)` | `{{obj \| prop("a.b.c")}}` | Nested property access |
| `parseJSON` | `{{jsonStr \| parseJSON}}` | Parse JSON string |
| `stringify` | `{{obj \| stringify}}` | JSON.stringify |

#### Validation Filters
| Filter | Example | Result |
|---|---|---|
| `isEmail` | `{{email \| isEmail}}` | `true` / `false` |
| `isUrl` | `{{link \| isUrl}}` | `true` / `false` |

### Nested Property Paths

The `prop`, `map`, and `filter` filters support dot-notation paths for nested object access:

```
{{response | prop("data.user.name")}}               → deeply nested value
{{users | map("address.city")}}                      → ["NYC", "LA", "NYC"]
{{items | filter(meta.status=active)}}               → filter by nested field
```

If a key literally contains a dot (e.g. `"a.b"`), direct key lookup takes priority over nested traversal.

### No-Input Filters

Use `@` as input when you don't need a variable:

```
{{@ | format("Hello {0} {1}", firstName, lastName)}}
```

### Filter Argument Semantics

- **Quoted** args (`"hello"` or `'hello'`) → always literal strings
- **Unquoted** args (`tax`, `count`) → variable lookup first, fallback to literal

```
{{price | add(tax)}}            → looks up variable 'tax', adds its value
{{price | add(10)}}             → adds literal 10
{{name | replace("old", "new")}} → literal replacement strings
```

### JavaScript Expressions

Write JavaScript expressions directly inside `{{ }}`:

```
{{price * quantity}}                          → math operations
{{status === 'active' ? 'yes' : 'no'}}       → ternary
{{firstName + ' ' + lastName}}                → string concatenation
{{`Hello ${name}`}}                           → template literals
{{name.toUpperCase()}}                        → string methods
{{Math.round(price * 1.1)}}                   → Math built-ins
{{Date.now()}}                                → current timestamp
```

Expressions run in a sandboxed environment (Node.js `vm` module) with:
- **100ms timeout** to prevent infinite loops
- **Safe built-ins only**: `Math`, `Date`, `JSON`, `Number`, `String`, `Boolean`, `Array`, `Object`, `parseInt`, `parseFloat`, `isNaN`, `encodeURIComponent`, `decodeURIComponent`
- **No access** to `require`, `process`, `fs`, or any Node.js APIs

### Dynamic Variables

Dynamic variables (prefixed with `$`) generate values at execution time:

| Variable | Example | Result |
|---|---|---|
| `$guid` / `$uuid` | `{{$guid}}` | Random UUID v4 |
| `$timestamp` | `{{$timestamp}}` | Unix timestamp (ms) |
| `$timestamp_s` | `{{$timestamp_s}}` | Unix timestamp (seconds) |
| `$randomInt(min, max)` | `{{$randomInt(1, 100)}}` | Random integer |
| `$randomString(len)` | `{{$randomString(16)}}` | Random alphanumeric |
| `$randomHexadecimal(len)` | `{{$randomHexadecimal(8)}}` | Random hex string |
| `$randomEmail` | `{{$randomEmail}}` | Random email address |
| `$randomBoolean` | `{{$randomBoolean}}` | `true` or `false` |
| `$isoTimestamp` | `{{$isoTimestamp}}` | ISO 8601 datetime |
| `$datetime` | `{{$datetime}}` | ISO datetime |
| `$date` | `{{$date}}` | `YYYY-MM-DD` |
| `$time` | `{{$time}}` | `HH:mm:ss` |
| `$base64Encode(text)` | `{{$base64Encode("hello")}}` | Base64 encoded |
| `$base64Decode(encoded)` | `{{$base64Decode("aGVsbG8=")}}` | Base64 decoded |
| `$urlEncode(text)` | `{{$urlEncode("a b")}}` | URL encoded |
| `$urlDecode(encoded)` | `{{$urlDecode("a%20b")}}` | URL decoded |

#### Environment variables in dynamic variable args

Unquoted arguments are resolved from environment variables:

```
{{$randomInt(minValue, maxValue)}}   → resolves minValue and maxValue from env
{{$randomString(strLength)}}          → resolves strLength from env
```

Quoted arguments are always literals:

```
{{$base64Encode("hello")}}           → always encodes the literal "hello"
```

### Resolution Pipeline

Templates are resolved in this order (first match wins):

1. **Dynamic variables** — `{{$guid}}`, `{{$randomInt(1, 100)}}`
2. **Filter chains** — `{{variable | upper | trim}}`
3. **Variable lookup** — `{{baseUrl}}` from environment/collection/globals
4. **JavaScript expressions** — `{{price * quantity}}`
5. **Original text** — `{{unknown}}` left unchanged

### IntelliSense / Autocomplete

All Monaco editors (request body, GraphQL, scripts) provide context-aware code completion for the template engine:

| Trigger | Context | Suggestions |
|---|---|---|
| Type `{{` | Opening a template expression | All environment, collection, and global variables (with live values), 18 dynamic variables, and the `@ \| filter` snippet |
| Type `$` inside `{{ }}` | Dynamic variable prefix | All 18 dynamic variables with descriptions (`$guid`, `$timestamp`, `$randomInt`, etc.) |
| Type `\|` inside `{{ }}` | Pipe operator | 30+ filters grouped by category (String, Math, Encoding, Hash, Array, Object, Validation) — filters with parameters include tab-stop snippets |
| Continue typing inside `{{ }}` | General | Variables and dynamic vars filtered by typed prefix |

Variable suggestions update in real-time — switching environments or calling `pm.environment.set()` immediately reflects in the autocomplete list. Priority: environment > collection > global (duplicates suppressed).
