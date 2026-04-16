# Environments & Variables

HTTP Forge supports multiple variable scopes to keep request data consistent across environments.

## Scopes
- **Globals**: workspace‑wide
- **Environment**: selected environment
- **Collection**: applies to requests in a collection
- **Session**: temporary values during the session

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
1. Session
2. Collection
3. Environment
4. Globals

## Environment selection
The environment dropdown controls:
- Variable resolution
- Default headers
- Environment‑specific credentials

## Local secrets
Store secrets in a gitignored file (for example, `http-forge.secrets.json`).
Reference them by name from environments or scripts.

### Folder layout example
```
http-forge/environments/
├── _global.json
├── _secrets.json
└── dev.json
```

## File watching
Changes to environment JSON files automatically:
- Refresh the **Environments tree view** in the sidebar
- Reload **all open Request Tester panels** with the latest resolved environment data

No manual refresh is needed — edits from other VS Code tabs, external editors, or git operations are reflected immediately.

_global.json
```json
{
	"variables": {
		"tenant": "TELUS",
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
	"baseUrl": "https://api.example.com",
	"apiKey": "{{API_KEY}}",
	"tenant": "telus"
}
```

## Tips
- Keep variable names consistent across environments
- Prefer collection variables for per‑collection defaults

---

## Template Engine — Filters, Expressions & String Concatenation

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
3. **Variable lookup** — `{{baseUrl}}` from environment/collection/session
4. **JavaScript expressions** — `{{price * quantity}}`
5. **Original text** — `{{unknown}}` left unchanged

### IntelliSense / Autocomplete

All Monaco editors (request body, GraphQL, scripts) provide context-aware code completion for the template engine:

| Trigger | Context | Suggestions |
|---|---|---|
| Type `{{` | Opening a template expression | All environment, collection, global, and session variables (with live values), 18 dynamic variables, and the `@ \| filter` snippet |
| Type `$` inside `{{ }}` | Dynamic variable prefix | All 18 dynamic variables with descriptions (`$guid`, `$timestamp`, `$randomInt`, etc.) |
| Type `\|` inside `{{ }}` | Pipe operator | 30+ filters grouped by category (String, Math, Encoding, Hash, Array, Object, Validation) — filters with parameters include tab-stop snippets |
| Continue typing inside `{{ }}` | General | Variables and dynamic vars filtered by typed prefix |

Variable suggestions update in real-time — switching environments or setting session variables immediately reflects in the autocomplete list. Priority: environment > collection > global > session (duplicates suppressed).
