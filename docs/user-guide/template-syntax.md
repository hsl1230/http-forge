# Template Syntax Reference

HTTP Forge supports a rich template engine inside `{{ }}` for request URLs, params, query strings, headers, bodies, and scripts.

## Where templates work
- Request URL / path
- Path params
- Query params
- Headers
- Request body
- GraphQL body and variables
- Pre-request and post-response scripts

## Variable lookup
Use `{{variableName}}` to resolve variables from these scopes:
1. Session
2. Collection
3. Environment
4. Globals

### Example
```text
{{baseUrl}}/users/{{userId}}
```

## Dynamic variables
Dynamic variables begin with `$` and generate values at execution time.

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

### Environment variables in dynamic variable args
Unquoted arguments inside dynamic variable calls are resolved from variables in the current scope.

```text
{{$randomInt(minValue, maxValue)}}   → minValue and maxValue are looked up from env/collection/session/globals
{{$randomString(strLength)}}         → strLength is resolved from variables
```

Quoted arguments are literals:

```text
{{$base64Encode("hello")}}           → encodes the literal string "hello"
```

## Filter pipes
You can chain filters using `|` after any variable or value:

```text
{{variable | filter1 | filter2(args)}}
```

### String filters
| Filter | Example | Result |
|---|---|---|
| `upper` | `{{name \| upper}}` | Uppercase |
| `lower` | `{{name \| lower}}` | Lowercase |
| `trim` | `{{input \| trim}}` | Trim whitespace |
| `length` | `{{name \| length}}` | String length |
| `substring(start, end)` | `{{name \| substring(0, 3)}}` | Substring |
| `replace(search, replacement)` | `{{text \| replace("old", "new")}}` | Replace text |
| `split(separator)` | `{{csv \| split(",")}}` | Split to array |
| `join(separator)` | `{{array \| join(", ")}}` | Join array |
| `removeQuotes` | `{{text \| removeQuotes}}` | Remove quotes |
| `removeSpaces` | `{{text \| removeSpaces}}` | Remove whitespace |
| `format(template, ...)` | `{{firstName \| format("{0} {1}", lastName)}}` | Format string |

### Math filters
| Filter | Example | Result |
|---|---|---|
| `add(n)` | `{{price \| add(tax)}}` | Adds value |
| `subtract(n)` | `{{total \| subtract(5)}}` | Subtracts value |
| `multiply(n)` | `{{price \| multiply(quantity)}}` | Multiplies |
| `abs` | `{{value \| abs}}` | Absolute value |

### Encoding filters
| Filter | Example | Result |
|---|---|---|
| `btoa` | `{{text \| btoa}}` | Base64 encode |
| `atob` | `{{encoded \| atob}}` | Base64 decode |
| `urlEncode` | `{{query \| urlEncode}}` | URL encode |
| `urlDecode` | `{{encoded \| urlDecode}}` | URL decode |

### Hash filters
| Filter | Example | Result |
|---|---|---|
| `hash(algo, encoding)` | `{{text \| hash("sha256", "hex")}}` | Hash digest |
| `hmac(secret, algo, encoding)` | `{{text \| hmac("mySecret", "sha256")}}` | HMAC signature |

Supported hash algorithms: `md5`, `sha1`, `sha256`, `sha512`.

### Array filters
| Filter | Example | Result |
|---|---|---|
| `first` | `{{items \| first}}` | First element |
| `last` | `{{items \| last}}` | Last element |
| `at(index)` | `{{items \| at(2)}}` | Element at index |
| `slice(start, end)` | `{{items \| slice(0, 3)}}` | Sub-array |
| `unique` | `{{items \| unique}}` | Deduplicated array |
| `filter(expr)` | `{{users \| filter(age>25)}}` | Filter array |
| `map(prop)` | `{{users \| map("name")}}` | Map property |

Filter conditions support operators: `>`, `>=`, `<`, `<=`, `=`, `!=`, `*=`, `^=`, `$=`.

### Object filters
| Filter | Example | Result |
|---|---|---|
| `prop(path)` | `{{obj \| prop("a.b.c")}}` | Nested property access |
| `parseJSON` | `{{jsonStr \| parseJSON}}` | Parse JSON string |
| `stringify` | `{{obj \| stringify}}` | JSON stringify |

### Validation filters
| Filter | Example | Result |
|---|---|---|
| `isEmail` | `{{email \| isEmail}}` | `true` / `false` |
| `isUrl` | `{{link \| isUrl}}` | `true` / `false` |

## Nested paths
`prop`, `map`, and `filter` support dot-notation for nested properties:

```text
{{response \| prop("data.user.name")}}
{{users \| map("address.city")}}
{{items \| filter(meta.status=active)}}
```

## No-input filters
Use `@` when no input variable is required:

```text
{{@ \| format("Hello {0} {1}", firstName, lastName)}}
```

## Filter argument rules
- Quoted args (`"text"`) are literals.
- Unquoted args (`price`, `tax`) are variable references.

Examples:
```text
{{price \| add(tax)}}
{{price \| add(10)}}
{{name \| replace("old", "new")}}
```

## JavaScript expressions
Use sandboxed JavaScript directly in templates:

```text
{{price * quantity}}
{{status === 'active' ? 'yes' : 'no'}}
{{firstName + ' ' + lastName}}
{{`Hello ${name}`}}
{{Math.round(price * 1.1)}}
{{Date.now()}}
```

Supported sandboxed built-ins include `Math`, `Date`, `JSON`, `Number`, `String`, `Boolean`, `Array`, `Object`, `parseInt`, `parseFloat`, `isNaN`, `encodeURIComponent`, `decodeURIComponent`.

## Resolution order
Templates are resolved in this order:
1. Dynamic variables
2. Filter chains
3. Variable lookup
4. JavaScript expressions
5. Original text (if unresolved)

## Autocomplete help
- Type `{{` to see variables and dynamic vars.
- Type `$` inside `{{ }}` to see dynamic variable suggestions.
- Type `|` inside `{{ }}` to see filter suggestions.

For the full template engine reference, use this page whenever you need to know what can go inside `{{ }}`.
