# Scripts & Assertions

HTTP Forge scripts are Postman‑compatible and run in two phases.

## Phases
- **Pre‑request**: modify request, set variables
- **Post‑response**: validate response, assert expectations

## Aliases
You can use any alias:
- `ctx` (recommended)
- `pm`
- `agl`

## Request API (pre‑request)
- `ctx.request.url`
- `ctx.request.method`
- `ctx.request.headers`
- `ctx.request.body`
- `ctx.request.params`
- `ctx.request.query`
- `ctx.request.setHeader(name, value)`
- `ctx.request.removeHeader(name)`

## Response API (post‑response)
- `ctx.response.status` / `ctx.response.statusText`
- `ctx.response.headers` (HeaderList: `.get()`, `.has()`, `.toObject()`, `.each()`)
- `ctx.response.cookies`
- `ctx.response.json()` / `ctx.response.text()`
- `ctx.response.responseTime`
- `ctx.response.responseSize`

## Variables API
Scopes:
- `ctx.variables` (session)
- `ctx.environment`
- `ctx.collectionVariables`
- `ctx.globals`
- `ctx.iterationData` (read-only, data-driven testing)

Methods:
- `get`, `set`, `unset`, `clear`, `has`, `toObject`, `replaceIn`

## Tests & assertions
- `ctx.test(name, fn)` (sync and async callbacks supported)
- `ctx.expect(value)`
- `ctx.response.to.have.status()`
- `ctx.response.to.have.header()`
- `ctx.response.to.have.jsonBody()`
- `ctx.response.to.be.ok` / `.success` / `.error` / `.clientError` / `.serverError` (getters or functions)

### Expect chain assertions
| Method | Notes |
|---|---|
| `.to.equal()` | Strict equality |
| `.to.eql()` | Deep equality |
| `.to.deep.equal()` | Deep equality (alias) |
| `.to.have.property()` | Object property check |
| `.to.include()` | Contains value |
| `.to.match()` | Regex match |
| `.to.be.a()` / `.to.be.an()` | Type checking |
| `.to.have.lengthOf()` | Array/string length |
| `.to.exist` | Not null/undefined |
| `.to.have.members()` | Array members |
| `.to.have.keys()` | Object keys |
| `.to.have.string()` | String contains |
| `.to.be.ok` | Truthy |
| `.to.be.true` / `.false` / `.null` / `.undefined` / `.empty` | Value checks |
| `.to.be.above()` / `.below()` / `.within()` | Numeric range |
| `.not` | Negation chain |

### How assertions affect pass/fail

**In Test Suites**: When assertions are defined, they determine whether a request passes or fails. This is useful for testing expected error conditions:

```javascript
// This test expects a 404, so the request passes when 404 is returned
ctx.test('Missing resource returns 404', () => {
    ctx.expect(ctx.response.status).to.equal(404);
});
```

**In Request Tester**: Assertions are displayed in the Tests tab. Pass/fail is shown with green/red indicators.

## Send additional requests
```javascript
ctx.sendRequest({
	url: '{{baseUrl}}/health',
	method: 'GET'
}, (err, res) => {
	if (err) console.error(err);
	console.log(res.status);
});
```

## Example: pre‑request
```javascript
ctx.environment.set('timestamp', Date.now().toString());
ctx.request.setHeader('X-Trace', ctx.environment.get('timestamp'));
```

## Example: validate JSON schema (simple)
```javascript
ctx.test('has user id', () => {
	const json = ctx.response.json();
	ctx.expect(json).to.have.property('id');
});
```

## Example: post‑response
```javascript
ctx.test('status is 200', () => {
	ctx.expect(ctx.response.status).to.equal(200);
});

const token = ctx.response.json().token;
ctx.environment.set('authToken', token);
```

## Console output
Use `console.log`, `console.warn`, `console.error` to send output to the Console tab.

## Execution flow control (suite runner)
- `ctx.execution.setNextRequest(name)` — Jump to a named request in the suite
- `ctx.execution.setNextRequest(null)` — Stop suite execution after current request
- `ctx.execution.skipRequest()` — Skip the HTTP call (pre-request scripts only)
- `ctx.setNextRequest(name)` — Top-level alias

These only affect suite runner execution. In the Request Tester, they are silently ignored.

## Visualizer
Render custom HTML visualizations from response data using Handlebars templates:

```javascript
const template = `
<table>
  <tr><th>Name</th><th>Status</th></tr>
  {{#each items}}
  <tr><td>{{name}}</td><td>{{status}}</td></tr>
  {{/each}}
</table>`;

pm.visualizer.set(template, { items: pm.response.json().data });
```

The rendered output appears in the **Visualize** tab of the Request Tester response panel.

## Sandbox globals
- `xml2Json(xmlString)` — Convert XML to JSON object
- `jsonStringify(value)` — Alias for `JSON.stringify()`
- `jsonParse(string)` — Alias for `JSON.parse()`

## CryptoJS
Full CryptoJS library available in scripts:
- **Hashing**: SHA1, SHA256, SHA384, SHA512, SHA3, MD5, RIPEMD160
- **HMAC**: HmacSHA1, HmacSHA256, HmacSHA384, HmacSHA512, HmacMD5
- **Encryption**: AES, DES, TripleDES (encrypt/decrypt)
- **Key derivation**: PBKDF2
- **Encoding**: Hex, Base64, Utf8, Latin1, Utf16

```javascript
// Hash
const hash = CryptoJS.SHA256('hello').toString();

// HMAC
const hmac = CryptoJS.HmacSHA256('message', 'secret').toString();

// AES encryption
const encrypted = CryptoJS.AES.encrypt('data', 'passphrase').toString();
const decrypted = CryptoJS.AES.decrypt(encrypted, 'passphrase').toString(CryptoJS.enc.Utf8);

// PBKDF2
const key = CryptoJS.PBKDF2('password', 'salt', { keySize: 256/32, iterations: 1000 });
```

## Cookies API
- `ctx.cookies.toObject()` — Flat `{name: value}` map of all cookies
- `ctx.cookies.jar()` — Cookie jar with `set()`, `get()`, `clear()`, `getAll()`
- `ctx.response.cookies` — Response cookies array
- `ctx.response.cookie(name)` — Get specific cookie
- `ctx.response.hasCookie(name)` — Check cookie exists

## Script API IntelliSense

The pre-request and post-response script editors provide context-aware code completion for the full scripting API. Type `hf.`, `pm.`, or `ctx.` followed by `.` to get suggestions:

| Path | Suggestions |
|---|---|
| `hf.` | `variables`, `environment`, `session`, `globals`, `collectionVariables`, `request`, `response`, `cookies`, `test()`, `expect()`, `sendRequest()`, `info` |
| `hf.variables.` | `get(key)`, `set(key, value)`, `has(key)`, `unset(key)`, `clear()`, `toObject()`, `replaceIn(str)` |
| `hf.environment.` | `get(key)`, `set(key, value)`, `has(key)`, `name`, … |
| `hf.request.` | `url`, `method`, `headers`, `body`, `params`, `query` |
| `hf.request.headers.` | `add()`, `get()`, `has()`, `remove()`, `update()`, `upsert()` |
| `hf.response.` | `status`, `json()`, `text()`, `getHeader()`, `to` |
| `hf.response.to.have.` | `status()`, `header()`, `body()`, `jsonBody()` |
| `hf.response.to.be.` | `ok()`, `error()`, `clientError()`, `serverError()` |
| `expect(x).to.` | `equal()`, `include()`, `property()`, `above()`, `below()`, `not`, `ok`, `empty`, … |

Methods with parameters include snippet tab-stops for quick filling.

## Template Engine in Scripts

The same template engine available in the Request Tester (filters, expressions, dynamic variables) works directly in pre-request and post-response script source code. All `{{variable}}` templates are **automatically resolved** before the script executes — no need to wrap strings in `replaceIn()`.

### Automatic pre-resolution

HTTP Forge runs the full 5-step resolution pipeline on your script source before VM execution:

1. **Dynamic variables**: `{{$guid}}`, `{{$randomInt(1, 100)}}`
2. **Filter chains**: `{{username | upper}}`, `{{price | add(tax)}}`
3. **Variable lookup**: `{{baseUrl}}` from environment/collection/session
4. **JavaScript expressions**: `{{price * quantity}}`
5. **Original text**: unresolved placeholders left as-is

This means you can write templates directly in your script code:

```javascript
// Templates auto-resolve before the script runs
const url = '{{baseUrl}}/api/users';
const token = '{{authToken | trim}}';
const id = '{{$guid}}';
const greeting = '{{firstName + " " + lastName}}';

console.log(url);  // → 'https://api.example.com/api/users'
```

### Using filters in scripts
```javascript
// Filters work directly in script source strings
ctx.request.url = '{{baseUrl}}/api/{{resourceId | upper}}';
ctx.request.setHeader('Authorization', 'Basic {{credentials | btoa}}');

// Dynamic variables with environment-resolved arguments
const id = '{{$randomInt(minId, maxId)}}';
ctx.variables.set('requestId', id);
```

### `replaceIn()` is still available

The `replaceIn()` method remains available for **runtime dynamic strings** — strings constructed at execution time that contain `{{}}` patterns:

```javascript
// replaceIn() is needed when the template string is built at runtime
const templateStr = hf.variables.get('urlTemplate'); // e.g. '{{baseUrl}}/{{path}}'
const resolved = hf.variables.replaceIn(templateStr);
```

> **Double-resolution is safe**: If you call `replaceIn()` on a string that was already pre-resolved, it simply returns the string unchanged because there are no `{{}}` markers left to process.
