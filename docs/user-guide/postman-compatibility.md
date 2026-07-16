# Postman Compatibility Reference

This guide documents the Postman‑compatible script API available in HTTP Forge. It reflects the current implementation.

## Aliases
The same API is available through these aliases:
- `ctx`
- `pm`
- `agl`

## Pre‑request: request API
| Postman | HTTP Forge | Notes |
| --- | --- | --- |
| `pm.request.url` | `ctx.request.url` | get/set |
| `pm.request.method` | `ctx.request.method` | get/set |
| `pm.request.headers` | `ctx.request.headers` | object |
| `pm.request.body` | `ctx.request.body` | get/set |
| `pm.request.addHeader()` | `ctx.request.setHeader()` | name differs |
| `pm.request.removeHeader()` | `ctx.request.removeHeader()` | same |
| — | `ctx.request.params` | path params |
| — | `ctx.request.query` | query params |

## Variables
| Postman | HTTP Forge | Notes |
| --- | --- | --- |
| `pm.variables.*` | `ctx.variables.*` | merged scope (reads all scopes) |
| `pm.environment.*` | `ctx.environment.*` | environment scope |
| `pm.collectionVariables.*` | `ctx.collectionVariables.*` | collection scope |
| `pm.globals.*` | `ctx.globals.*` | workspace scope |

Supported methods: `get`, `set`, `has`, `unset`, `clear`, `toObject`, `replaceIn`.

**Type-safe storage**: `set(key, value)` accepts any type (string, number, boolean, array, object). `get(key)` returns the exact type that was stored — no manual `JSON.stringify`/`JSON.parse` needed. This matches modern Postman behavior.

Additional scope:
- `pm.iterationData.*` — Read-only access to data-driven iteration variables.

## Post‑response: response API
| Postman | HTTP Forge | Notes |
| --- | --- | --- |
| `pm.response.code` | `ctx.response.code` | status **code** (number, e.g. `200`) |
| `pm.response.status` | `ctx.response.status` | reason **phrase** string (e.g. `"OK"`) — like Postman |
| `pm.response.reason()` | `ctx.response.reason()` | reason phrase string |
| `pm.response.headers` | `ctx.response.headers` | `HeaderList` (`get`, `has`, `toObject`, `each`) |
| `pm.response.body` | `ctx.response.body` | raw response **string** (parse with `json()`) |
| `pm.response.json()` | `ctx.response.json()` | parse JSON |
| `pm.response.text()` | `ctx.response.text()` | body as text |
| `pm.response.responseTime` | `ctx.response.responseTime` | time (ms) |
| `pm.response.responseSize` | `ctx.response.responseSize` | size (bytes) |
| `pm.response.cookies` | `ctx.response.cookies` | `CookieList` (`get`, `one`, `has`, `toObject`, iterable) |
| `pm.response.cookies.get(name)` | `ctx.response.cookies.get(name)` | cookie value string |
| `pm.response.cookies.one(name)` | `ctx.response.cookies.one(name)` | full cookie object (incl. `secure`, `maxAge`, ...) |

## Tests and assertions
| Postman | HTTP Forge |
| --- | --- |
| `pm.test(name, fn)` | `ctx.test(name, fn)` |
| `pm.expect(value)` | `ctx.expect(value)` |

Common assertions:
- `.to.equal()` / `.to.eql()` / `.to.deep.equal()`
- `.to.have.property()`
- `.to.include()`
- `.to.match()`
- `.to.be.ok` / `.to.be.true` / `.to.be.false`
- `.to.be.a()` / `.to.be.an()` — Type checking
- `.to.have.lengthOf()` — Array/string length
- `.to.exist` — Not null/undefined
- `.to.have.members()` — Array members
- `.to.have.keys()` — Object keys
- `.to.have.string()` — String contains
- `.to.have.status()` via `ctx.response.to.have.status()`
- `.to.have.header()` via `ctx.response.to.have.header()`
- `.to.have.jsonBody()` via `ctx.response.to.have.jsonBody()`
- `ctx.response.to.be.ok` / `.success` / `.error` / `.clientError` / `.serverError` — Work as getters and functions

Async tests:
```javascript
pm.test('async test', async () => {
  const data = await someAsyncCall();
  pm.expect(data).to.exist;
});
```

## Send requests from scripts
`pm.sendRequest()` is supported as `ctx.sendRequest()`.

Example:
```javascript
ctx.sendRequest({
  url: '{{baseUrl}}/status',
  method: 'GET'
}, (err, res) => {
  if (err) return console.error(err);
  console.log(res.status);
});
```

## Example: Postman‑style script
```javascript
pm.test('status is 200', () => {
  pm.expect(pm.response.code).to.equal(200);   // .code is the number; .status is "OK"
  pm.response.to.have.status(200);             // or the Postman assertion form
});

const token = pm.response.json().token;
pm.environment.set('authToken', token);
```

## Notes
- Request auth is configured in the UI; scripts can add headers as needed.
- `pm.response.cookies` is a Postman-compatible `CookieList`: use `cookies.get(name)` for the value string, `cookies.one(name)` for the full cookie object (`name`, `value`, `domain`, `path`, `expires`, `maxAge`, `httpOnly`, `secure`, `sameSite`), `cookies.has(name)`, `cookies.toObject()`, or iterate (`forEach`, `for...of`, numeric index).
- `pm.cookies.toObject()` returns a flat `{name: value}` map.
- `pm.cookies.jar()` returns a cookie jar with `getAll()`, `get()`, `set()`, `unset()`, and `clear()`.
- Cookie-jar methods accept host strings, full URL strings, and `pm.request.url` objects in Postman-style callback form, for example `jar.clear(pm.request.url, cb)` and `jar.get(pm.request.url, 'sid', cb)`.

## Response body type

Like Postman, `ctx.response.body` (and `pm.response.body`) is the **raw response string** — it is not eagerly parsed. Parse JSON on demand:

```javascript
// Postman-compatible: body is a string
const data = pm.response.json();        // parses ctx.response.body
const text = pm.response.text();        // raw string
const obj  = JSON.parse(pm.response.body);
```

`json()` returns the parsed object (or `null` for non-JSON), and `text()` returns the raw string. An already-parsed object body is still tolerated for backward compatibility.

## Legacy Postman globals

Older Postman scripts and many Newman-exported collections rely on bare globals from the pre-`pm.*` sandbox. HTTP Forge injects these so legacy scripts run unmodified.

Available in **both** pre-request and test scripts:

| Global | Description |
| --- | --- |
| `request` | Plain snapshot: `{ id, name, description, url, method, headers, data }` (distinct from the rich `pm.request`) |
| `environment` | Read snapshot of environment variables (write via `postman.setEnvironmentVariable()`) |
| `globals` | Read snapshot of globals (write via `postman.setGlobalVariable()`) |
| `data` | Current data-file / iteration row |
| `iteration` | Iteration index |
| `tv4` | JSON Schema validator (`tv4.validate(data, schema)`) — available when the optional `tv4` module is installed |

Available in **test** scripts only:

| Global | Description |
| --- | --- |
| `responseBody` | Raw response **string** (use `JSON.parse(responseBody)`) |
| `responseCode` | `{ code, name, detail }` |
| `responseHeaders` | Headers object |
| `responseTime` | Response time in ms |
| `responseCookies` | Array of cookie objects with full metadata (`name`, `value`, `domain`, `path`, `expires`, `maxAge`, `httpOnly`, `secure`, `sameSite`) |
| `tests` | Legacy assertion bag: `tests['name'] = boolean` |
| `postman.getResponseHeader(name)` | Case-insensitive header lookup (returns `null` if absent) |
| `postman.getResponseCookie(name)` | Case-insensitive cookie lookup returning the full cookie object (`name`, `value`, `domain`, `path`, `expires`, `maxAge`, `httpOnly`, `secure`, `sameSite`), or `null` if absent |

The legacy `postman.*` namespace also provides variable helpers: `setNextRequest`, `setGlobalVariable` / `getGlobalVariable` / `clearGlobalVariable`, and `setEnvironmentVariable` / `getEnvironmentVariable` / `clearEnvironmentVariable`.

> Note: `environment` and `globals` are read snapshots — direct assignment never persisted in legacy Postman either. Use the `postman.set*` helpers (or the modern `pm.environment.set()` / `pm.globals.set()`) to persist changes.

Example (legacy-style test script):

```javascript
tests['status 200'] = responseCode.code === 200;
tests['has token'] = JSON.parse(responseBody).token !== undefined;
var ct = postman.getResponseHeader('Content-Type');
tests['is json'] = /application\/json/.test(ct);
```

## Execution flow control
- `pm.execution.setNextRequest(name)` — Jump to a named request in suite runner
- `pm.execution.setNextRequest(null)` — Stop suite execution after current request
- `pm.execution.skipRequest()` — Skip the HTTP call (pre-request scripts only)
- `pm.setNextRequest(name)` — Top-level alias

These only affect suite runner execution. In the Request Tester, they are silently ignored.

## Visualizer
```javascript
pm.visualizer.set(template, data);
```
Render custom HTML in the Visualize tab using Handlebars templates. Supports `{{variable}}`, `{{{unescaped}}}`, `{{#each}}`, `{{#if}}`, `{{else}}`.

## Sandbox globals
- `xml2Json(xmlString)` — Convert XML to JSON
- `jsonStringify(value)` — `JSON.stringify()` alias
- `jsonParse(string)` — `JSON.parse()` alias

## CryptoJS
Full CryptoJS available: hash (SHA256, SHA512, MD5, etc.), HMAC, AES/DES/TripleDES encrypt/decrypt, PBKDF2, and encoding helpers (Hex, Base64, Utf8).

## Response headers (HeaderList API)
- `pm.response.headers.get(name)` — Get header value
- `pm.response.headers.has(name)` — Check if header exists
- `pm.response.headers.toObject()` — Flat `{name: value}` map
- `pm.response.headers.each(callback)` — Iterate headers

## Request headers API
- `pm.request.headers.toObject()` — Flat `{name: value}` map
- `pm.request.headers.each(callback)` — Iterate headers

## Request URL object
`pm.request.url` is a Postman SDK-compatible Url object:
- `getHost()`, `getPath()`, `getQueryString()`
- Properties: `protocol`, `host`, `port`, `path`, `query`, `hash`
