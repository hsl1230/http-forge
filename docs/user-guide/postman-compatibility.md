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
| `pm.variables.*` | `ctx.variables.*` | session scope |
| `pm.environment.*` | `ctx.environment.*` | environment scope |
| `pm.collectionVariables.*` | `ctx.collectionVariables.*` | collection scope |
| `pm.globals.*` | `ctx.globals.*` | workspace scope |

Supported methods: `get`, `set`, `has`, `unset`, `clear`, `toObject`, `replaceIn`.

Additional scope:
- `pm.iterationData.*` — Read-only access to data-driven iteration variables.

## Post‑response: response API
| Postman | HTTP Forge | Notes |
| --- | --- | --- |
| `pm.response.code` | `ctx.response.status` | status code |
| `pm.response.status` | `ctx.response.status` | status code |
| `pm.response.reason()` | `ctx.response.statusText` | status text |
| `pm.response.headers` | `ctx.response.headers` | headers object |
| `pm.response.body` | `ctx.response.body` | body string |
| `pm.response.json()` | `ctx.response.json()` | parse JSON |
| `pm.response.text()` | `ctx.response.text()` | body as text |
| `pm.response.responseTime` | `ctx.response.responseTime` | time (ms) |
| `pm.response.responseSize` | `ctx.response.responseSize` | size (bytes) |
| — | `ctx.response.cookies` | cookies object |
| — | `ctx.response.cookie(name)` | get cookie |
| — | `ctx.response.hasCookie(name)` | check cookie |

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
  pm.expect(pm.response.status).to.equal(200);
});

const token = pm.response.json().token;
pm.environment.set('authToken', token);
```

## Notes
- Request auth is configured in the UI; scripts can add headers as needed.
- Cookies are handled automatically and exposed via `ctx.response.cookies`.
- `pm.cookies.toObject()` returns a flat `{name: value}` map.
- `pm.cookies.jar()` returns a cookie jar with `set()`, `get()`, `clear()`, `getAll()`.

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
